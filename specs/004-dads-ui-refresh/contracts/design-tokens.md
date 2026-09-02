# Contract: デザイントークン

**Feature**: 004-dads-ui-refresh | **Date**: 2026-09-02

`sidepanel.css` が定義し、UIの全コンポーネントが参照するトークンの契約。テストはこの契約に対して検証する。

## 1. 色トークン

### ライトテーマ (`:root`)

| トークン | 値 | DADS出典 |
|---|---|---|
| `--color-bg` | `#ffffff` | White |
| `--color-surface` | `#ffffff` | White |
| `--color-surface-hover` | `#f2f2f2` | SolidGray-50 |
| `--color-text` | `#1a1a1a` | SolidGray-900 |
| `--color-text-muted` | `#666666` | SolidGray-600 |
| `--color-border` | `#7f7f7f` | SolidGray-500 |
| `--color-border-subtle` | `#cccccc` | SolidGray-200 |
| `--color-accent` | `#0017c1` | Blue-900 |
| `--color-accent-contrast` | `#ffffff` | White |
| `--color-tab-bg` | `#f2f2f2` | SolidGray-50 |
| `--color-tab-active-bg` | `#e8f1fe` | Blue-50 |
| `--color-success` | `#197a4b` | Green-800 |
| `--color-error` | `#ce0000` | Red-900 |
| `--color-warning` | `#927200` | Yellow-900 |

### ダークテーマ (`@media (prefers-color-scheme: dark)` および `:root[data-theme="dark"]`)

| トークン | 値 | DADS出典 |
|---|---|---|
| `--color-bg` | `#1a1a1a` | SolidGray-900 |
| `--color-surface` | `#1a1a1a` | SolidGray-900 |
| `--color-surface-hover` | `#333333` | SolidGray-800 |
| `--color-text` | `#f2f2f2` | SolidGray-50 |
| `--color-text-muted` | `#b3b3b3` | SolidGray-300 |
| `--color-border` | `#949494` | SolidGray-420 |
| `--color-border-subtle` | `#4d4d4d` | SolidGray-700 |
| `--color-accent` | `#9db7f9` | Blue-300 |
| `--color-accent-contrast` | `#1a1a1a` | SolidGray-900 |
| `--color-tab-bg` | `#1a1a1a` | SolidGray-900 |
| `--color-tab-active-bg` | `#333333` | SolidGray-800 |
| `--color-success` | `#51b883` | Green-400 |
| `--color-error` | `#ff7171` | Red-400 |
| `--color-warning` | `#ffd43d` | Yellow-300 |

### `--color-hover-overlay`(アイコンボタン共通のホバー背景)

アイコンのみのボタン(`.icon-button`、`.copy-button`、`.kebab-button`、`.reorder-button`、`.tab-add`、`.tab-menu-button`)は、ホバー時に角丸の背景を敷いて操作対象であることを示す。実機確認(2026-09-02)の要望による。それまではヘッダーの`＋`だけに背景があり、ケバブにはホバー指定自体が無かった。

| テーマ | 値 |
|---|---|
| ライト | `rgba(0, 0, 0, 0.06)` |
| ダーク | `rgba(255, 255, 255, 0.1)` |

**不透明色ではなく半透明にする理由**: 項目カードはホバーで背景が `--color-surface-hover` に変わる。ボタンの背景に同じ不透明色を使うと差が出ず、カード内のどのボタンを指しているのか分からない。半透明なら、カード面(`--color-surface`)の上でもカードのホバー面の上でも、さらに一段変化して見える。

重ね合わせ後の実効色に対する前景のコントラスト比(いずれも基準4.5を満たす):

| 背景 | 実効色 | `--color-text` のコントラスト比 |
|---|---|---|
| ライト カード面 | `#f0f0f0` | 15.27 |
| ライト カードのホバー面 | `#e3e3e3` | 13.56 |
| ダーク カード面 | `#313131` | 11.62 |
| ダーク カードのホバー面 | `#474747` | 8.30 |

テストは半透明の合成を計算した上でこの4条件を検証する。

### オーバーレイ背景

`--color-overlay` はフォームオーバーレイの背後を覆う半透明の黒。コントラスト比の検査対象外(その上に文字を置かないため)。

| テーマ | 値 |
|---|---|
| ライト | `rgba(0, 0, 0, 0.5)` |
| ダーク | `rgba(0, 0, 0, 0.7)` |

## 2. 検査ペア

コントラスト比テストが検証する組み合わせ。ライト/ダーク両テーマに対して同じ一覧を適用する。

| # | 前景 | 背景 | 必要比 | 画面上の該当箇所 |
|---|---|---|---|---|
| 1 | `--color-text` | `--color-bg` | 4.5 | 項目名、ラベル、選択件数 |
| 2 | `--color-text` | `--color-surface` | 4.5 | カード上の項目名、入力欄の文字 |
| 3 | `--color-text` | `--color-surface-hover` | 4.5 | メニュー項目のホバー時 |
| 4 | `--color-text-muted` | `--color-bg` | 4.5 | 空状態、補助ラベル |
| 5 | `--color-text-muted` | `--color-surface` | 4.5 | 項目の値 |
| 6 | `--color-text-muted` | `--color-surface-hover` | 4.5 | ホバー時の補助テキスト |
| 7 | `--color-accent` | `--color-bg` | 4.5 | コピーボタンの文字 |
| 8 | `--color-accent` | `--color-surface` | 4.5 | カード上のアクセント文字 |
| 9 | `--color-accent` | `--color-surface-hover` | 4.5 | メニューの選択中項目 |
| 11b | `--color-success` | `--color-surface` | 3.0 | コピー成功時のアイコン |
| 11c | `--color-success` | `--color-surface-hover` | 3.0 | 同上(ホバー面上) |
| 12 | `--color-accent-contrast` | `--color-accent` | 4.5 | 保存ボタンの文字 |
| 11 | `--color-success` | `--color-bg` | 4.5 | コピー成功メッセージ |
| 12 | `--color-error` | `--color-bg` | 4.5 | エラーメッセージ |
| 13 | `--color-error` | `--color-surface` | 4.5 | 削除ボタンの文字 |
| 14 | `--color-warning` | `--color-bg` | 4.5 | 警告表示 |
| 15 | `--color-text-muted` | `--color-tab-bg` | 4.5 | 非選択タブの文字 |
| 16 | `--color-accent` | `--color-tab-active-bg` | 4.5 | 選択タブの文字 |
| 17 | `--color-border` | `--color-bg` | 3.0 | カード・入力欄の境界線 |
| 18 | `--color-border` | `--color-surface` | 3.0 | カード上の境界線 |
| 19 | `--color-border` | `--color-surface-hover` | 3.0 | ホバー面の境界線 |

### 検査対象外とするもの

| 対象 | 理由 |
|---|---|
| 面同士の色の差(`--color-tab-bg` と `--color-bg` など) | WCAG 1.4.11 は隣接する面の色差に3:1を求めない。選択状態は文字色と太さで区別する(FR-019)。research.md R4 参照 |
| `--color-border-subtle` | 純装飾の区切り線にのみ用いる。情報を伝えないため1.4.11の対象外 |
| `--color-overlay` | 上に文字を置かない |
| フォーカス表示の黒外周 | 二層のうち内側(Yellow-300)が地に対し視認を担保する。research.md R5 参照 |

### 判定式

WCAG 2.x の相対輝度によるコントラスト比。

```
L = 0.2126*R + 0.7152*G + 0.0722*B
  ただし各チャンネル c (0〜1に正規化) について
  c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4

ratio = (L_lighter + 0.05) / (L_darker + 0.05)
```

## 3. 書体トークン

| トークン | 値 |
|---|---|
| `--font-family-sans` | `"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif` |
| `--font-size-base` | `14px` |
| `--line-height-body` | `1.7` |
| `--line-height-dense` | `1.3` |
| `--line-height-oneline` | `1` |
| `--letter-spacing-std` | `0.02em` |

文字サイズは14pxの1段階に統一する。実機確認(2026-09-02)で文字を一段小さくする要望があり、DADSの下限14px(FR-010)まで下げた結果、本文と補助テキストが同サイズになったため。項目名と値の区別は文字の太さ(700 / 400)と色(`--color-text` / `--color-text-muted`)で行う。

行間は用途ごとに使い分ける。本文相当は `--line-height-body`(1.7、FR-012の1.5倍以上を満たす)、情報密度を要する箇所は `--line-height-dense`(1.3)、単一行で完結するUI要素は `--line-height-oneline`(1)。

字間はDADSのStd系の値(`0.02em`)を全体に適用する。DADSはDns系を`0`と定めているが、字間の使い分けは本仕様の要件(FR-008〜FR-012)に含まれず、狭幅UIでの可読性にも影響しないため、トークンを1種に統一している。

アイコンのみを表示するボタン(`.icon-button` 18px、`.kebab-button`・`.tab-menu-button`)は記号の視認性のためトークンを用いず個別に指定する。いずれも14px以上。

`@font-face` 定義:

```css
@font-face {
  font-family: "Noto Sans JP";
  src: url("fonts/NotoSansJP-subset.woff2") format("woff2");
  font-weight: 400 700;
  font-display: swap;
}
```

## 4. 余白・角丸・影トークン

| トークン | 値 | 用途 |
|---|---|---|
| `--space-1` | `4px` | アイコンとラベルの間隔 |
| `--space-2` | `8px` | 基準の間隔 |
| `--space-3` | `12px` | 要素内の詰め |
| `--space-4` | `16px` | 領域の詰め |
| `--space-5` | `24px` | 領域間の区切り |
| `--radius-control` | `8px` | ボタン、入力欄、メニュー項目 |
| `--radius-container` | `12px` | 項目カード、メニュー面、フォーム |
| `--radius-full` | `9999px` | タブ |
| `--elevation-2` | `0 2px 12px 2px rgba(0,0,0,.1), 0 1px 6px 0 rgba(0,0,0,.3)` | ポップアップメニュー |
| `--elevation-6` | `0 10px 30px 6px rgba(0,0,0,.1), 0 3px 12px 0 rgba(0,0,0,.3)` | 登録フォーム |

DADSのエレベーションは8段階あるが、本UIに存在する重なりは「ポップアップメニュー」と「登録フォーム」の2種のみのため2段階を使う。項目カードは影を持たず境界線で面を表現する。

## 5. コンポーネント対応表

現行の文字サイズと、刷新後の割り当て。14px未満の13箇所がすべて解消される。

| セレクタ | 現行 | 刷新後 | 行間 |
|---|---|---|---|
| `body` | (未指定=16px) | `--font-size-md` 16px | `--line-height-body` 1.7 |
| `.search-input` | 13px | `--font-size-md` 16px | `--line-height-dense` 1.3 |
| `.mask-toggle` | 12px | `--font-size-sm` 14px | `--line-height-dense` 1.3 |
| `.icon-button` | 18px | 18px(据置) | — |
| `.more-menu-label` | 11px | `--font-size-base` 14px | `--line-height-dense` 1.3 |
| `.more-menu-item` | 13px | `--font-size-base` 14px | `--line-height-oneline` 1 |
| `.tab-button` | 13px | `--font-size-base` 14px | `--line-height-oneline` 1 |
| `.tab-rename-input` | 13px | `--font-size-base` 14px | `--line-height-dense` 1.3 |
| `.tab-menu button` | 11px | `--font-size-base` 14px | `--line-height-oneline` 1 |
| `.tab-menu-button` | 14px | 14px(据置) | — |
| `.selection-toolbar` | 13px | `--font-size-base` 14px | `--line-height-dense` 1.3 |
| `.item-name` | (継承16px) | `--font-size-base` 14px / 700 | `--line-height-dense` 1.3 |
| `.item-value` | 13px | `--font-size-base` 14px | `--line-height-body` 1.7 |
| `.copy-button` | 12px | (アイコン化、32×32px、枠線なし) | — |
| `.kebab-button` | 16px | 16px(据置) | — |
| `.reorder-button` | (新規) | `--font-size-base` 14px | `--line-height-oneline` 1 |
| `.item-menu button` | 11px | `--font-size-base` 14px | `--line-height-oneline` 1 |
| `.empty-state` | (継承) | `--font-size-base` 14px | `--line-height-body` 1.7 |
| `.copy-status` | 12px | `--font-size-base` 14px | `--line-height-dense` 1.3 |
| `.error` | 12px | `--font-size-base` 14px | `--line-height-dense` 1.3 |
| `.field` | 13px | `--font-size-base` 14px | `--line-height-dense` 1.3 |
| `.field input/textarea/select` | (継承13px) | `--font-size-base` 14px | `--line-height-dense` 1.3 |
| `.actions button` | (継承) | `--font-size-base` 14px | `--line-height-oneline` 1 |

`.drag-handle` は並び替えUIの変更(実機確認 2026-09-02)により `.reorder-button` へ置き換わったため、対応表から除いている。

アイコンのみのボタン(`.icon-button` 18px、`.kebab-button` 16px、`.tab-menu-button` 14px)は記号を表示する要素であり、いずれも14px以上のため据え置く。

## 5b. アイコン

コピーボタンのアイコンは data URI の SVG を `mask` で描き、`background-color: currentColor` で色を追従させる。

**記号文字を使わない理由**: 同梱書体のサブセットにコピー記号(U+29C9 等)とチェックマーク(U+2713 / U+2714)が収録されていないため、記号文字ではフォールバック書体に落ちて字形が環境依存になる(実機確認 2026-09-02 での判明)。SVGなら字形が固定され、`currentColor` で配色トークンにも追従できる。

| 状態 | アイコン | 色 |
|---|---|---|
| 通常 | 重なった四角 | `--color-text` |
| ホバー | 同上 | `--color-text`(背景のみ変化) |
| コピー成功(2秒間) | チェックマーク | `--color-success` |

`mask` は Chrome 120 未満ではプレフィックスが必要なため `-webkit-mask` を併記する。

ボタンには `aria-label="<項目名>をコピー"` と `title="コピー"` を付与する。アイコンのみでは操作の意味が伝わらないため、支援技術にはラベルで、マウス利用者にはツールチップで補う。コピー結果は既存の `role="status"` の領域(`.copy-status`)でも文言として伝える(FR-005)。

なお、ケバブボタンの `⋮`(U+22EE)も収録範囲外でフォールバック表示となっている。表示上の実害はないため現状のままとするが、記号を追加・変更する際は収録範囲の確認が必要。

## 6. フォーカス表示

全インタラクティブ要素に共通で適用する。テーマによる色の変更を行わない。

```css
:focus-visible {
  outline: 2px solid transparent;
  outline-offset: 2px;
  box-shadow:
    0 0 0 2px #ffd43d,
    0 0 0 4px #000000;
}
```

二層(Yellow-300の内側2px + 黒の外周2px、合計4px)を `box-shadow` で描く。

**`outline` と `border-radius` の組み合わせを用いない理由**: 当初はDADSの実装例どおり `outline: 4px solid #000000` と `border-radius: 4px` を指定したが、実機確認(2026-09-02)で問題が判明した。`:focus-visible` に `border-radius` を書くと各要素の角丸が上書きされ、タブ(`--radius-full`)やカード(`--radius-container`)の形が崩れる。また4pxの外周が隣接要素や文字に被って見えた。`box-shadow` は要素自身の `border-radius` に自動追従するため、形を保ったままリングを描ける。

透明な `outline` は、Windowsのハイコントラストモードで `box-shadow` が描画されない環境への保険。

対象要素: `button`, `input`, `textarea`, `select`, `a`, および `tabindex` を持つ要素。

**要素間の間隔**: リングは要素の外側4pxに描かれるため、インタラクティブ要素が並ぶ箇所の `gap` は8px(`--space-2`)以上とする。該当箇所は `.tabs`、`.tab-wrapper`、`.tab-menu`、`.more-menu`、`.more-menu-section`、`.item-menu`、`.reorder-controls`。

## 7. 支援技術向け属性

| 要素 | 属性 | 現状 | 変更 |
|---|---|---|---|
| グループタブ(選択中) | `aria-current="true"` | なし | 追加(FR-019) |
| グループタブ(非選択) | `aria-current` | なし | 付与しない |
| 並び替えボタン(▲▼) | `aria-label="<項目名>を上/下に移動"` | (新規) | 追加(FR-016 / FR-018) |
| その他のボタン・入力 | `aria-label` | 付与済み | 変更なし |
| エラー表示 | `role="alert"` | 付与済み | 変更なし |
| コピー結果 | `role="status"` | 付与済み | 変更なし |
