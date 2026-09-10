# Contract: グループ選択状態の記憶・復元契約

対象: `src/storage/settingsRepository.js`、`src/sidepanel/sidepanel.js`（`init()` / `selectTab()`）

## settingsRepository.js 契約

- `get()` が返すオブジェクトは `selectedGroupId` フィールドを含む。既定値（保存データ未作成・
  旧バージョンからの移行直後）は `null`
- 新規関数 `setSelectedGroupId(groupId)` を追加する：
  - 引数 `groupId` は文字列（通常のグループID、または `UNASSIGNED_TAB_ID`）を受け取る
  - `null` を渡した場合はエラーにせず `selectedGroupId` を `null` に戻せる（将来のリセット用途に
    備える。本feature内では未使用）
  - 既存の `setMaskEnabled` / `setTheme` / `setLanguage` と同じ「現在値を読み、対象フィールドのみ
    上書きして書き戻す」パターンに従う
  - バリデーション（グループの実在確認）は行わない。実在確認は読み出し側（`sidepanel.js`）の責務

## sidepanel.js 契約

- `selectTab(groupId)` は、既存の選択状態更新・再描画処理に加えて
  `SettingsRepository.setSelectedGroupId(groupId)` を呼び出す。呼び出しは非同期だが、UIの
  再描画（`renderTabs()` / `renderList()`）を待たせない（`await` するが直列化のみで、ユーザー操作を
  ブロックする追加のローディング状態は導入しない）
- `init()` は以下の順で選択グループを決定する：
  1. `GroupRepository.listTabOrder()` で現在のタブ順序（未分類含む）を取得する
  2. `SettingsRepository.get()` で `selectedGroupId` を取得する
  3. `selectedGroupId` が `tabOrder` に含まれていれば、それを `selectedTabId` の初期値として採用する
  4. 含まれていなければ（`null`、または削除済みグループのID）、`tabOrder[0]` を採用する
- 上記以外の初期化処理（`initMaskToggle()` 等）の順序・挙動は変更しない

## 非対象（変更しないもの）

- `groupRepository.js` の関数シグネチャ・`groups` / `tabOrder` キーのスキーマ
- 全グループパネル（`groupPanel.js`）、並べ替え（`dragReorder.js`）の挙動
- 項目登録・編集・削除・マスク表示・選択モード（一括削除・一括グループ変更）の挙動
