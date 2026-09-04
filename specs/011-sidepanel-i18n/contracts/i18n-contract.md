# Contract: i18n モジュールと翻訳キー一覧

対象: `src/i18n/index.js`（新規）、`src/i18n/ja.js`（新規）、`src/i18n/en.js`（新規）

## エクスポート（`src/i18n/index.js`）

```text
setLanguage(lang: "ja" | "en"): void
getLanguage(): "ja" | "en"
t(key: string, params?: Record<string, unknown>): string
applyStaticTranslations(root?: ParentNode): void
```

### `setLanguage(lang)`

現在の言語を切り替える。無効な値（`"ja"` / `"en"` 以外）を渡された場合は `"ja"` として扱う
（呼び出し側の `SettingsRepository.get()` が既に異常値を `"ja"` に丸めているため、通常は
到達しないが、モジュール単体としても防御する）。

### `getLanguage()`

現在の言語を返す。初期値は `"ja"`。

### `t(key, params)`

現在の言語の辞書（`ja.js` または `en.js`）から `key` を引く。

- 値が文字列の場合、`{token}` 形式のプレースホルダーを `params[token]` で置換して返す
  （`params` に存在しないトークンは置換せずそのまま残す）。
- 値が関数の場合、`params`（省略時は `{}`）を渡して呼び出し、戻り値をそのまま返す。
- `key` が辞書に存在しない場合、`key` をそのまま返す（例外を投げない。[research.md](../research.md) R-002）。

### `applyStaticTranslations(root)`

`root`（省略時は `document`）配下の以下の属性を持つ要素を走査し、`t(key)` の結果を反映する。

| 属性 | 反映先 |
|------|--------|
| `data-i18n-text` | `textContent` |
| `data-i18n-placeholder` | `placeholder` |
| `data-i18n-aria-label` | `aria-label` |
| `data-i18n-title` | `title` |

1つの要素が複数の属性を同時に持つ場合、それぞれ独立して反映する
（例: `data-i18n-aria-label` と `data-i18n-title` が同じキーを指す）。

---

## 辞書の契約

`src/i18n/ja.js` と `src/i18n/en.js` は、**デフォルトエクスポートとして同じキー集合を持つ
オブジェクト**を返す。キーの過不足はユニットテストで検証する
（[research.md](../research.md) R-001）。

### テスト観点（`tests/unit/i18n.test.js`）

- `Object.keys(ja default)` と `Object.keys(en default)` が完全に一致する（過不足なし）。
- `t(key, params)` が文字列値のプレースホルダーを正しく置換する。
- `t(key, params)` が関数値を `params` 付きで呼び出し、戻り値を返す。
- `t()` に存在しないキーを渡すと、そのキー文字列がそのまま返る（例外を投げない）。
- `setLanguage("en")` 後に `t()` が英語辞書を参照する。`setLanguage("ja")` に戻すと日本語に戻る。
- `setLanguage()` に無効な値を渡すと `"ja"` として扱われる。
- `getLanguage()` の初期値が `"ja"` である。
- 英語の件数キー（`selection.count` 等）が `count === 1` のとき単数形、`count !== 1` のとき
  複数形を返す（[research.md](../research.md) R-003）。

---

## 翻訳キー一覧

全キーを一覧する。**実装はこの表に定義されたキーのみを使用し、表にないキーを追加する場合は
この契約を更新する。** `type` が `fn` のキーは辞書内で関数として定義する（R-002）。

| キー | type | params | 日本語 | 英語 |
|------|------|--------|--------|------|
| `header.searchPlaceholder` | str | - | 項目名で検索 | Search by item name |
| `header.maskToggle` | str | - | マスク解除 | Unmask |
| `header.addItem` | str | - | 項目を追加 | Add item |
| `header.moreMenu` | str | - | その他のメニュー | More menu |
| `tabs.ariaLabel` | str | - | グループタブ | Group tabs |
| `common.unassigned` | str | - | 未分類 | Unassigned |
| `tabs.openPanelButton` | fn | count | ▾ {count} | ▾ {count} |
| `tabs.openPanelAria` | fn | count | グループ一覧を開く（全{count}件） | Open group list (count varies) 参照 |
| `tabs.openPanelTitle` | str | - | グループ一覧 | Group list |
| `selection.count` | fn | count | {count}件選択中 | count varies 参照 |
| `selection.groupChange` | str | - | グループ変更 | Change group |
| `selection.delete` | str | - | 削除 | Delete |
| `selection.cancel` | str | - | キャンセル | Cancel |
| `selection.changeGroupLabel` | str | - | 変更先グループ | Target group |
| `selection.apply` | str | - | 適用 | Apply |
| `selection.confirmDelete` | fn | count | 選択した{count}件の項目を削除しますか？この操作は取り消せません。 | count varies 参照 |
| `itemList.empty` | str | - | 登録済みの項目はありません。 | No items registered yet. |
| `itemList.emptyFiltered` | str | - | 該当する項目はありません。 | No matching items. |
| `itemCard.selectAria` | fn | name | {name}を選択 | Select {name} |
| `itemCard.copyAria` | fn | name | {name}をコピー | Copy {name} |
| `itemCard.copyTitle` | str | - | コピー | Copy |
| `itemCard.kebabAria` | fn | name | {name}の操作 | Actions for {name} |
| `itemCard.edit` | str | - | 編集 | Edit |
| `itemCard.delete` | str | - | 削除 | Delete |
| `itemCard.confirmDelete` | fn | name | 「{name}」を削除しますか？ | Delete "{name}"? |
| `itemForm.nameLabel` | fn | max | 名前（1〜{max}文字） | Name (1–{max} characters) |
| `itemForm.valueLabel` | fn | max | 値（1〜{max}文字、複数行可） | Value (1–{max} characters, multiline allowed) |
| `itemForm.groupLabel` | str | - | グループ | Group |
| `itemForm.save` | str | - | 保存 | Save |
| `itemForm.cancel` | str | - | キャンセル | Cancel |
| `itemForm.errorNameLength` | fn | max | 名前は1〜{max}文字で入力してください。 | Name must be 1–{max} characters. |
| `itemForm.errorValueLength` | fn | max | 値は1〜{max}文字で入力してください。 | Value must be 1–{max} characters. |
| `itemForm.errorLimit` | str | - | これ以上項目を登録できません。 | You cannot register any more items. |
| `itemForm.errorGeneric` | str | - | 保存に失敗しました。もう一度お試しください。 | Failed to save. Please try again. |
| `copyStatus.success` | str | - | コピーしました | Copied |
| `copyStatus.failure` | str | - | コピーに失敗しました | Failed to copy |
| `moreMenu.theme` | str | - | テーマ | Theme |
| `moreMenu.themeAuto` | str | - | 自動 | Auto |
| `moreMenu.themeLight` | str | - | ライト | Light |
| `moreMenu.themeDark` | str | - | ダーク | Dark |
| `moreMenu.language` | str | - | 言語 | Language |
| `moreMenu.languageJa` | str | - | 日本語 | 日本語 |
| `moreMenu.languageEn` | str | - | English | English |
| `moreMenu.select` | str | - | 選択 | Select |
| `groupPanel.filterPlaceholder` | str | - | グループ名で絞り込み | Filter by group name |
| `groupPanel.closeAria` | str | - | グループ一覧を閉じる | Close group list |
| `groupPanel.empty` | str | - | 該当するグループはありません。 | No matching groups. |
| `groupPanel.addButtonLabel` | str | - | ＋ グループを追加 | + Add group |
| `groupPanel.rename` | str | - | 名称変更 | Rename |
| `groupPanel.delete` | str | - | 削除 | Delete |
| `groupPanel.nameAria` | str | - | グループ名 | Group name |
| `groupPanel.rowMenuAria` | fn | label | {label}の操作 | Actions for {label} |
| `groupPanel.itemCountAria` | fn | count | {count}件 | count varies 参照 |
| `groupPanel.errorNameLength` | fn | max | グループ名は1〜{max}文字で入力してください。 | Group name must be 1–{max} characters. |
| `groupPanel.errorLimit` | str | - | グループはこれ以上作成できません。 | You cannot create any more groups. |
| `groupPanel.errorRenameGeneric` | str | - | 名称の変更に失敗しました。もう一度お試しください。 | Failed to rename. Please try again. |
| `groupPanel.errorCreateGeneric` | str | - | グループの作成に失敗しました。もう一度お試しください。 | Failed to create the group. Please try again. |
| `groupPanel.errorDeleteGeneric` | str | - | グループの削除に失敗しました。もう一度お試しください。 | Failed to delete the group. Please try again. |
| `groupPanel.errorReorderGeneric` | str | - | 並び順の保存に失敗しました。表示を保存済みの状態に戻します。 | Failed to save the order. Restoring the saved order. |
| `groupPanel.confirmDelete` | fn | name, count | グループ「{name}」を削除しますか？所属する項目{count}件もすべて削除されます。この操作は取り消せません。 | count varies 参照 |

「count varies 参照」の英語エントリは、`(p) => \`${p.count} item${p.count === 1 ? "" : "s"} ...\`` の
ように件数に応じて単数・複数を分岐する関数として実装する（[research.md](../research.md) R-003）。
具体的な文面は実装時に確定するが、以下の形を踏襲する。

| キー | 英語（単数 / 複数） |
|------|---------------------|
| `tabs.openPanelAria` | `Open group list (1 group)` / `Open group list ({count} groups)` |
| `selection.count` | `1 item selected` / `{count} items selected` |
| `selection.confirmDelete` | `Delete 1 selected item? This cannot be undone.` / `Delete {count} selected items? This cannot be undone.` |
| `groupPanel.itemCountAria` | `1 item` / `{count} items` |
| `groupPanel.confirmDelete` | `Delete group "{name}"? Its 1 item will also be deleted. This cannot be undone.` / `Delete group "{name}"? Its {count} items will also be deleted. This cannot be undone.` |

### `moreMenu.languageJa` / `moreMenu.languageEn` の扱い

この2キーは、**日本語辞書と英語辞書で値が同一**（`"日本語"` / `"English"`）である
（spec FR-002a、`/speckit.clarify` の決定：言語の選択肢は各言語の自称で固定表示し、
表示中の言語によって訳語に変えない）。値が同一であることをテストで固定する
（`ja["moreMenu.languageJa"] === en["moreMenu.languageJa"]` など）。

### `common.unassigned` について

`sidepanel.js`（タブのラベル）と `groupPanel.js`（縦リストの行のラベル）の両方が、
同じ「未分類」という概念を指すために参照する共有キー。単語の偶然の一致ではなく
同一エンティティ（未分類グループ）を指すため、領域別キーではなく `common.*` に置く。

## 呼び出し側の対応表（実装の参照用）

| ファイル | 対象 | 対応方法 |
|---------|------|---------|
| `sidepanel.html` | ヘッダー・選択ツールバー・項目登録フォーム・全グループパネルの静的ラベル | `data-i18n-*` 属性 |
| `sidepanel.js` | タブ・項目カード・その他メニュー・コピー通知・確認ダイアログ・検証エラー | 生成箇所で `t()` を直接呼ぶ |
| `groupPanel.js` | 縦リストの行・確認ダイアログ・検証エラー | 生成箇所で `t()` を直接呼ぶ |
