# Data Model: サイドパネルUI刷新

本specはUI形態の刷新のみを対象とし、永続データのスキーマは
`specs/001-quick-copy-items/data-model.md` から変更しない。以下は既存エンティティの再掲と、
本UIで新たに扱う非永続（画面内一時状態）の整理。

## 既存エンティティ（変更なし・001準拠）

### Item（項目）

| フィールド | 型 | 制約 |
|-----------|-----|------|
| id | string(UUID) | 一意識別子 |
| name | string | 1〜50文字 |
| value | string | 1〜2000文字（複数行可） |
| groupId | string \| null | 所属グループID。`null` は未分類 |
| createdAt | string(ISO8601) | 作成日時 |
| updatedAt | string(ISO8601) | 更新日時 |

登録上限500件（req-000001）。バリデーション・永続化ロジックは `src/storage/itemRepository.js`
のまま変更しない。

### Group（グループ）

| フィールド | 型 | 制約 |
|-----------|-----|------|
| id | string(UUID) | 一意識別子 |
| name | string | 1〜30文字 |

作成上限50件（req-000004）。ロジックは `src/storage/groupRepository.js` のまま変更しない。
削除時、所属項目は `groupId: null`（未分類）へ一括更新（`reassignGroup`、既存実装のまま）。

### Settings（設定）

| フィールド | 型 | 既定値 |
|-----------|-----|--------|
| maskEnabled | boolean | `true` |

ロジックは `src/storage/settingsRepository.js` のまま変更しない。

## 本UIで新たに扱う画面内一時状態（非永続）

以下はいずれも `chrome.storage.local` には保存しない、サイドパネルのメモリ内状態のみ。

| 状態 | 型 | 説明 | ライフサイクル |
|------|-----|------|----------------|
| selectedTabId | string \| `"__unassigned__"` | 選択中タブ（グループ）のID。未分類タブは固定値 | パネルを開くたびに先頭タブへ初期化 |
| searchTerm | string | 検索欄の入力値 | タブ切替時にクリア（Clarifications参照。FR-013） |
| editingItemId | string \| null | インライン編集中の項目ID（`null`は新規登録モード） | 入力用UIを閉じると破棄（Edge Cases: 未保存内容は破棄） |
| isFormOpen | boolean | 項目登録・編集用の入力UIの開閉状態 | 保存・キャンセル・パネルを閉じると`false`に戻る |

これらの状態は `src/sidepanel/sidepanel.js` 内のモジュールスコープ変数として保持し、
`itemFilter.js`（[[research]] 参照）には都度引数として渡す無状態設計とする。
