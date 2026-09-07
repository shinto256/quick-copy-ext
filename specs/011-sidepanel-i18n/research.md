# Phase 0: Research — サイドパネルの多言語対応

**Feature**: `011-sidepanel-i18n` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

spec の Assumptions で計画フェーズ送りとした項目を決定する。

---

## R-001: 辞書のキー構造

**Decision**: フラットな文字列キー（`"header.searchPlaceholder"` のようなドット区切り1段）を、
画面の領域ごとにグルーピングした辞書オブジェクトのキーとする。ネストしたオブジェクト
（`{ header: { searchPlaceholder: ... } }`）ではなく、トップレベルのキーとして持つ。

```js
// src/i18n/ja.js
export default {
  "header.searchPlaceholder": "項目名で検索",
  "moreMenu.theme": "テーマ",
  // ...
};
```

**Rationale**:

- キーの網羅性チェック（`ja.js` と `en.js` でキー集合が完全一致すること）を
  `Object.keys()` の比較だけで行える。ネストしていると再帰的な比較が必要になる。
- ドット区切りのプレフィックスで領域が分かるため、ネストの可読性上の利点をほぼ失わない。
- 既存コードの文字列は各ファイル（`sidepanel.js` / `groupPanel.js` / `sidepanel.html`）に
  散っているため、フラットなキーの方が「このキーはどこで使われているか」を検索しやすい
  （ネストしたパスをJS側で組み立てる必要がない）。

**Alternatives considered**:

- **ネストしたオブジェクト**: 見た目は整理されるが、キー網羅性チェックが複雑になる。
- **ファイル分割（`header.js` / `groupPanel.js` などキーごとに辞書ファイルを分ける）**:
  言語ごとに複数ファイルを同期させる必要が増え、キーの過不足に気づきにくくなる。
  1言語1ファイルの方が「日本語と英語を並べて差分を見る」ことができる。

---

## R-002: `t(key, params)` の実装

**Decision**: `src/i18n/index.js` に以下を実装する。

```js
export function setLanguage(lang) { /* 現在の言語を切り替える */ }
export function getLanguage() { /* 現在の言語を返す */ }
export function t(key, params) { /* 現在の言語の辞書からkeyを引き、paramsで展開して返す */ }
```

辞書の値は**文字列**または**関数**（`(params) => string`）のいずれか。

- 文字列の場合、`{token}` 形式のプレースホルダーを `params[token]` で置換する。
- 関数の場合、`params` を渡して呼び出し、戻り値をそのまま返す（R-003 の単数・複数分岐に使う）。

キーが辞書に存在しない場合は、開発中に気づけるよう `key` 自体をそのまま返す
（例外を投げて画面全体を止めない）。

**Rationale**:

- プレースホルダー展開が必要な文言（削除確認の名前、件数）と、単数・複数で文言そのものが
  変わる文言（英語の件数表示）の両方を、同じ `t()` の呼び出し方（`t(key, params)`）で
  扱えるようにするため、値を文字列か関数かで分岐させる。
- キー欠落時に例外を投げないのは、翻訳漏れが1箇所あっただけでサイドパネル全体が
  描画エラーで止まる事故を避けるため。R-006 のキー網羅性テストで欠落は別途検出する。

**Alternatives considered**:

- **ICU MessageFormat 相当のテンプレート構文を導入**: 本featureの言語は日本語・英語の2つのみで、
  複雑な複数形規則（ロシア語等）を持たない。フルのICU実装は過剰。
- **キー欠落時に例外を投げる**: 開発時の検知はテストで代替できるため、実行時に画面を
  止めるリスクを負う必要はない。

---

## R-003: 英語の単数・複数の扱い

**Decision**: 件数を含む文言（選択件数、グループの所属項目件数、タブ総数、削除確認の件数）は、
辞書の値を関数にし、英語側でのみ単数・複数を分岐させる。

```js
// src/i18n/en.js
"selection.count": (p) => `${p.count} item${p.count === 1 ? "" : "s"} selected`,

// src/i18n/ja.js
"selection.count": (p) => `${p.count}件選択中`,
```

日本語は常に関数で統一する（文字列と関数が混在してもよいが、同じキーで型を揃えた方が
`t()` の呼び出し側から見て一貫する）。

**Rationale**:

- spec Assumptions が「日本語には英語のような単数・複数の文法的区別がないため、この違いを
  翻訳文字列の設計に反映する」と定めている。英語側だけ条件分岐すれば足りる。
- 対応言語が2つで、英語の複数形規則は「1のときだけ単数、それ以外は複数」という単純な規則
  （日本語のような数詞変化、ロシア語のような3分岐等ではない）なので、三項演算子で十分。

**Alternatives considered**:

- **常に複数形で表示する（英語も日本語も数の区別をしない）**: `"1 items selected"` は
  英語話者に不自然。既存のUIの丁寧さ（spec 003〜010で確認・エラー文言を丁寧に作ってきた）と
  釣り合わない。

---

## R-004: 静的HTMLへの適用方法

**Decision**: `sidepanel.html` の翻訳対象要素に `data-i18n-text` / `data-i18n-placeholder` /
`data-i18n-aria-label` / `data-i18n-title` 属性でキーを持たせる。
`applyStaticTranslations(root = document)` が `root.querySelectorAll('[data-i18n-text], ...')` を
それぞれ走査し、`t(key)` の結果を `textContent` / `placeholder` / `aria-label` / `title` に設定する。

```html
<input data-i18n-placeholder="header.searchPlaceholder" ... />
<button data-i18n-aria-label="header.addItem" data-i18n-title="header.addItem">＋</button>
```

**Rationale**:

- 既存の静的HTML構造（`sidepanel.html`）をJSでの動的生成に置き換えずに済む。フォームの構造や
  `id` はそのままで、属性を1つ足すだけで翻訳対象にできる。
- 複数の属性（`aria-label` と `title` が同じ文言、など）を同じキーで指定でき、キーの重複を避けられる。
- `root` を引数にすることで、後から追加されるオーバーレイのようなDOM片にも同じ関数を適用できる
  （本featureでは `document` 全体を1回で十分だが、汎用性のために引数化する）。

**Alternatives considered**:

- **JSで全要素を生成し直す**: 既存の静的HTML（`item-form` など）を作り直す差分が大きくなる。
  属性追加の方が既存構造を保てる。
- **`textContent` に直接キー文字列を埋め込みビルド時に置換する**: ノービルド方針
  （technical.yaml）に反する。

---

## R-005: 動的生成される文字列への適用

**Decision**: `sidepanel.js` と `groupPanel.js` が `createElement` で組み立てる箇所は、
生成時に直接 `t(key, params)` を呼ぶ（既存の日本語ハードコードをそのまま置き換える）。
新しい仕組みは追加しない。

**Rationale**:

- これらの文字列は既存の再描画関数（`renderTabs` / `renderList` / `renderMoreMenu` /
  `groupPanel` 内の `renderList`）の中で毎回作り直されている。言語切替時にこれらの関数を
  呼び直しさえすれば、`t()` が現在の言語を見て新しい文字列を返すため、追加の伝播機構が要らない。
- `applyStaticTranslations`（R-004）と「既存の再描画関数を呼び直す」（R-006）の組み合わせで、
  静的部分・動的部分の両方を1つの言語切替処理からカバーできる。

---

## R-006: 言語切替時の再描画の伝播

**Decision**: `sidepanel.js` に既存の `selectTheme` と対になる `selectLanguage(lang)` を作る。
中身は次の呼び出し列。

```js
async function selectLanguage(lang) {
  currentLanguage = lang;
  await SettingsRepository.setLanguage(lang);
  setLanguage(lang); // src/i18n
  applyStaticTranslations(document);
  await renderTabs();
  await renderList();
  renderMoreMenu();
  groupPanel.refresh();
  moreMenuOpen = true; // メニューは開いたまま新しい言語で表示する（spec US1 シナリオ7）
  renderMoreMenu();
}
```

`groupPanel.js` の `initGroupPanel` の戻り値に `refresh()` を追加する。中身は
「パネルが開いていれば `renderList()` を呼ぶだけ」（パネルの開閉状態は変えない。spec FR-014）。
静的な見出し・プレースホルダーは `applyStaticTranslations(document)` が
全グループパネルのDOM（`sidepanel.html` に含まれる）もまとめて処理するため、`groupPanel.js` 側で
別途処理する必要はない。

**Rationale**:

- 言語切替の呼び出し元は `sidepanel.js` の1箇所のみ。汎用的な購読・通知の仕組み
  （pub/sub、イベント）を作ると、呼び出し元が1つしかないのに抽象を増やすことになる
  （プロジェクトの方針: 必要以上の抽象を作らない）。明示的な呼び出し列で十分。
- `groupPanel.refresh()` を関数として公開するのは、`groupPanel.js` が内部状態
  （`tabOrder` / `groupsById` / `countsByTabId` など）をモジュールスコープに閉じているため、
  `sidepanel.js` 側から直接再描画を起こす手段がないから。`open` / `close` / `isOpen` と
  同じ形で公開する。

**Alternatives considered**:

- **`window` にカスタムイベントを発火し、各モジュールが購読する**: 呼び出し元と購読先が
  1対1でしかないため、イベントの間接性を持ち込む理由がない。
- **`groupPanel.js` が独自に `SettingsRepository` を読んで言語変化を検知する**: 言語の変更点は
  `sidepanel.js` の操作起点（その他メニューの選択）に一元化されているため、`groupPanel.js` 側で
  監視する必要はない。

---

## R-007: 項目登録フォームの検証エラーの翻訳

**Decision**: `sidepanel.js` に `groupPanel.js` の `validationMessage` と同じ形の関数を作る。

```js
function itemValidationMessage(error, fallbackKey) {
  if (!(error instanceof ValidationError)) {
    return t(fallbackKey);
  }
  if (error.field === "name") {
    return t("itemForm.errorNameLength", { max: NAME_MAX_LENGTH });
  }
  if (error.field === "value") {
    return t("itemForm.errorValueLength", { max: VALUE_MAX_LENGTH });
  }
  if (error.field === "limit") {
    return t("itemForm.errorLimit");
  }
  return t(fallbackKey);
}
```

`ItemRepository` は上限値（`NAME_MAX_LENGTH` = 50、`VALUE_MAX_LENGTH` = 2000）を公開していないため、
`groupRepository.NAME_MAX_LENGTH` が `export const` になっているのと同様に、`itemRepository.js` の
2定数も `export const` にする（既存の内部 `const` から変更）。

**Rationale**:

- `ItemRepository` が投げる `ValidationError` の `field` は `"name"` / `"value"` / `"limit"` の
  3種類のみ（`orderedIds` は項目並び替えの検証で、項目登録フォームの保存経路では発生しない）。
  `groupPanel.js` の `validationMessage` と同じ「フィールド名で分岐し、フォールバックを持つ」
  形が流用できる。
- 上限文字数を文言に埋め込む（「1〜50文字」）のは既存のラベル表記
  （`sidepanel.html` の「名前（1〜50文字）」）と揃えるため。定数をハードコードで重複させず
  `itemRepository` からの `export` を参照する。

---

## R-008: `SettingsRepository` への追加

**Decision**: 既存の `setTheme` と対になる形で追加する。

```js
const VALID_LANGUAGES = ["ja", "en"];
const DEFAULT_SETTINGS = { maskEnabled: true, theme: "auto", language: "ja" };

export async function setLanguage(language) {
  if (!VALID_LANGUAGES.includes(language)) {
    throw new ValidationError("language", `language must be one of ${VALID_LANGUAGES.join(", ")}`);
  }
  const current = await get();
  await setItem(KEY, { ...current, language });
}
```

`get()` は既存のまま `{ ...DEFAULT_SETTINGS, ...stored }` で返すため、保存済みの `settings` に
`language` が無い状態（本feature導入前のデータ）でも `"ja"` が既定値として返る
（spec FR-005 / FR-007、Edge Cases の異常値フォールバックと合わせて、`get()` 側で
`VALID_LANGUAGES` に含まれない値を `"ja"` に丸める処理も加える）。

**Rationale**:

- 既存の `theme` と対称的な構造にすることで、レビューのしやすさと一貫性を保つ。
- 新規ストレージキーを設けない方針（spec 技術的制約）に従い、既存の `settings` キーに同居させる。

---

## 未解決事項

なし。
