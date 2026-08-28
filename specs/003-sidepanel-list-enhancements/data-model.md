# Data Model: サイドパネル一覧機能拡張

## 既存エンティティへの変更

### Item（項目）— スキーマ変更なし

`specs/001-quick-copy-items/data-model.md`で定義済みのフィールド（`id` / `name` / `value` /
`groupId` / `createdAt` / `updatedAt`）は変更しない。並び順は`items`配列内の要素順序そのもので
表現するため、新規フィールドは追加しない（[[research]] 1参照）。

- 新規登録時、項目は所属グループ内で配列の末尾に追加される（FR-005a）。
- グループ削除等で`groupId`が変わった項目は、移動後のグループ内で末尾に配置される（FR-005）。

### Settings（設定）— `theme`フィールドを追加

| フィールド | 型 | 既定値 | 備考 |
|-----------|-----|--------|------|
| maskEnabled | boolean | `true` | 既存（[[req-000003]]）。変更なし |
| theme | `"auto"` \| `"light"` \| `"dark"` | `"auto"` | 新規（[[req-000006]]） |

既存の`settingsRepository.get()`はデフォルト値`{ maskEnabled: true }`を返す実装だが、`theme`
未設定時（既存ユーザーのデータ移行時を含む）は`"auto"`として扱う。

## 本UIで新たに扱う画面内一時状態（非永続）

| 状態 | 型 | 説明 | ライフサイクル |
|------|-----|------|----------------|
| selectionMode | boolean | 選択モードのON/OFF | 選択モード開始操作でtrue、キャンセル操作・タブ切替・検索実行・一括削除完了でfalseに戻る |
| selectedItemIds | Set&lt;string&gt; | 選択モード中に選択された項目IDの集合 | selectionModeがfalseになるたびに空にする |
| draggingItemId | string \| null | ドラッグ操作中の項目ID(D&D実装用) | ドラッグ開始でセット、ドロップ/キャンセルでnullに戻す |

## Repository層に追加する操作

### itemRepository.reorderGroup(groupId, orderedIds)

- **入力**: `groupId`（`string | null`。`null`は未分類）、`orderedIds`（対象グループに属する
  全項目IDを新しい順序で並べた配列）。
- **検証**: `orderedIds`の集合が、現在`groupId`に属する項目ID集合と完全一致すること
  （過不足があれば`ValidationError`）。
- **出力**: 更新後の`Item[]`全体（`ItemRepository.list()`と同じ形）。
- **副作用**: `items`配列のうち`groupId`が一致する要素の相対順序のみを`orderedIds`の順序に
  差し替える。他グループの項目の相対順序は変更しない。

### itemRepository.removeMany(ids)

- **入力**: 削除対象の項目ID配列。
- **出力**: なし（Promise&lt;void&gt;）。
- **副作用**: 指定された全IDに一致する項目を`items`配列から一括除去し、1回の書き込みで永続化する。
  存在しないIDが含まれていてもエラーにはせず無視する（選択後に他操作で先に削除された場合に対応）。

### settingsRepository.setTheme(theme)

- **入力**: `"auto" | "light" | "dark"`。
- **出力**: なし（Promise&lt;void&gt;）。
- **副作用**: `settings.theme`を更新して永続化する（既存`setMaskEnabled`と同じパターン）。
