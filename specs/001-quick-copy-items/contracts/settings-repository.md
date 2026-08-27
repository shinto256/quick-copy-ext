# Contract: SettingsRepository

UI層（popup）とデータ層（storage）の境界インターフェース。実装は `src/storage/settingsRepository.js`。

## `get(): Promise<{ maskEnabled: boolean }>`

- 現在の表示設定を返す
- 未初期化（初回起動）の場合は `{ maskEnabled: true }` を返す（DisplaySettingのデフォルト値）
- 対応: FR-005, FR-008, SC-006

## `setMaskEnabled(value: boolean): Promise<void>`

- マスク表示の有効/無効を更新し `chrome.storage.local` に永続化する
- 対応: FR-007, FR-008, FR-009, US3
