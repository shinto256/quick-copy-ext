# Contract: その他メニューの「言語」セクションと言語切替の伝播

対象: `src/sidepanel/sidepanel.js`、`src/sidepanel/groupPanel.js`

`002-side-panel-ui` の既存のその他メニュー（テーマ・選択モード開始）に対する追加分。

---

## 1. 「言語」セクション（`sidepanel.js`）

`renderMoreMenu()` に「テーマ」セクションと同じ構造で「言語」セクションを追加する。
挿入位置は「テーマ」セクションの直後、区切り線（`.more-menu-divider`）の前。

```js
const LANGUAGE_OPTIONS = [
  { value: "ja", labelKey: "moreMenu.languageJa" },
  { value: "en", labelKey: "moreMenu.languageEn" },
];
```

- 見出しに `t("moreMenu.language")` を使う。
- 各選択肢は `t(option.labelKey)` をボタンのラベルにする。
  （[contracts/i18n-contract.md](./i18n-contract.md) の「`moreMenu.languageJa` /
  `moreMenu.languageEn` の扱い」のとおり、この2キーは言語によらず値が同一）
- 現在の言語（`currentLanguage`）と一致する選択肢に `.active` クラスを付ける
  （既存の `THEME_OPTIONS` の描画と同じパターン）。
- クリックで `selectLanguage(option.value)` を呼ぶ。

---

## 2. `selectLanguage(lang)`（`sidepanel.js`、新規）

`selectTheme(theme)` と対になる関数。

```text
async function selectLanguage(lang):
  currentLanguage = lang
  await SettingsRepository.setLanguage(lang)
  i18n.setLanguage(lang)
  applyStaticTranslations(document)
  await renderTabs()
  await renderList()
  groupPanel.refresh()
  renderMoreMenu()   // メニュー自体も新しい言語で再表示。開いたままにする
```

`moreMenuOpen` は変更しない（呼び出し時点で `true` のまま。spec US1 シナリオ7:
言語を切り替えてもその他メニューは開いたまま新しい言語で表示される）。

### 呼び出し順序の理由

1. `SettingsRepository.setLanguage` を先に呼ぶことで、以降の再描画中に例外が起きても
   保存自体は成立している（既存の `selectTheme` と同じ順序）。
2. `i18n.setLanguage` の後に再描画系を呼ぶことで、以降の `t()` 呼び出しが新しい言語を参照する。
3. `applyStaticTranslations` → `renderTabs` → `renderList` → `groupPanel.refresh` →
   `renderMoreMenu` の順は、画面の上（ヘッダー）から下（一覧）、最後に自分自身（メニュー）
   という描画順。依存関係はないため順不同でも動くが、既存の初期化コード
   （`init()` 内の呼び出し順）に合わせる。

---

## 3. `groupPanel.refresh()`（`groupPanel.js`、新規）

`initGroupPanel` の戻り値に追加する。

```text
refresh():
  if panelOpen:
    renderList()
```

パネルが閉じているときは何もしない（開いていない画面を再描画する必要がない。次に `open()` が
呼ばれたときに `loadData()` から最新の状態で描画されるため）。

**開閉状態は変更しない**（spec FR-014）。`renderList()` は既存の縦リスト描画関数で、
`tabLabel()` や行の生成が `t()` を経由するよう変更されていれば、呼び出すだけで新しい言語の
文言になる。

---

## 4. 項目登録フォームの検証エラー（`sidepanel.js`）

既存の `showItemError(error.message)` を、[research.md](../research.md) R-007 の
`itemValidationMessage(error, fallbackKey)` を経由する形に置き換える。

```text
catch (error):
  showItemError(itemValidationMessage(error, "itemForm.errorGeneric"))
```

`itemRepository.js` の `NAME_MAX_LENGTH` / `VALUE_MAX_LENGTH` を `export const` にし
（既存の内部 `const` から変更。`groupRepository.NAME_MAX_LENGTH` が既に `export const` なのと
揃える）、`itemValidationMessage` が `t("itemForm.errorNameLength", { max: NAME_MAX_LENGTH })` の
ように参照する。

---

## 5. 初期化（`sidepanel.js` の `init()`）

既存の `initMaskToggle()`（テーマの復元を含む）と同じタイミングで、`SettingsRepository.get()` の
戻り値から `currentLanguage` を復元し、`i18n.setLanguage(currentLanguage)` を呼ぶ。
その後に `applyStaticTranslations(document)` を呼んでから、以降の `renderTabs()` /
`renderList()` を実行する（初回描画から選択済みの言語が反映されるようにするため）。

---

## 契約検証方法

DOM操作と再描画が中心のため、既存specと同方針でユニットテスト対象外とする。
[quickstart.md](../quickstart.md) の手動検証シナリオで以下を確認する。

- その他メニューに「言語」セクションが「テーマ」の下に表示される
- 言語を切り替えると、開いたままのその他メニューを含む画面全体が新しい言語になる
- 全グループパネルを開いた状態で言語を切り替えても、パネルは開いたまま文言だけ変わる
- 選択モード中に言語を切り替えても、選択件数・選択状態は保たれる
- 項目登録フォームに入力中に言語を切り替えても、入力値は保たれる
- 項目登録フォームの検証エラーが選択中の言語で表示される
