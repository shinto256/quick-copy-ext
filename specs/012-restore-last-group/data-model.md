# Data Model: グループ選択状態の復元

## エンティティ: Settings（既存、フィールド追加）

`chrome.storage.local` キー `settings`（`src/storage/settingsRepository.js`）に既存フィールドと
並んで以下を追加する。

| フィールド | 型 | 既定値 | 説明 |
|-----------|-----|--------|------|
| `selectedGroupId` | `string \| null` | `null` | 直近に選択されていたグループのID。未分類タブが選択されていた場合は `UNASSIGNED_TAB_ID`（`src/sidepanel/itemFilter.js` のセンチネル値）を保持する。選択記憶が一度も存在しない場合（初回起動・旧バージョンからの移行直後）は `null` |

### バリデーションルール

- `selectedGroupId` は書き込み時点で追加のバリデーションを行わない（`groupPanel.js` や `selectTab()`
  経由で発生する値は常に「その時点で存在するタブID」であるため）
- 読み出し側（`sidepanel.js` の `init()`）が、`GroupRepository.listTabOrder()` の結果に
  `selectedGroupId` が含まれるかを都度チェックする。含まれない場合（グループ削除・`null`）は
  `tabOrder[0]` にフォールバックする。この整合性チェックはSettings側では行わず、利用側の責務とする

### 状態遷移

```text
[未設定 (null)] --ユーザーがタブを選択--> [selectedGroupId = 選択したタブのID]
[selectedGroupId = X] --ユーザーが別タブを選択--> [selectedGroupId = 新しいタブのID]
[selectedGroupId = X] --グループXが削除される--> [selectedGroupId = X のまま保持（無効値として残存）]
```

グループ削除時に `selectedGroupId` を積極的にクリアする処理は設けない。無効なIDが残っていても
読み出し側のフォールバック判定で先頭グループへ復元されるため、実害がなく、削除処理
（`groupRepository.remove`）への変更を避けられる（既存関数シグネチャ不変の制約に合致）。

## 関連する既存エンティティ（変更なし）

- **Group**（`groups` キー）: `{id, name}`。本featureでは参照のみ
- **TabOrder**（`tabOrder` キー）: グループID＋`UNASSIGNED_TAB_ID` の配列。本featureでは参照のみ
  （`GroupRepository.listTabOrder()` 経由で正規化済みの配列を取得する）
