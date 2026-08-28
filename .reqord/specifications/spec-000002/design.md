# spec-000002 - 一覧表示・コピー機能(デフォルトマスク表示)

## 対象要件: req-000002

## 設計概要

`ItemRepository.list()` で取得した項目をsidepanelのUIで一覧表示する。名前は常に平文表示、値は
`SettingsRepository` の `maskEnabled` に応じてマスク／平文を切り替える。コピーボタン押下で
Clipboard APIにより値の原文をコピーする。

## アーキテクチャ

本機能は structure.yaml の UI層(sidepanel)とデータ層(storage)の2層構成に従う。UI層は表示・
コピー操作のみを持ち、永続化ロジックは持たない。データ層(storageモジュール)はRepository
パターンで実装し、chrome.storage.localへの読み取りをここに集約する（technical.yamlの
decision「データアクセス層はRepositoryパターンで実装する」に準拠）。

## コンポーネント設計

- UI層: sidepanel（グループタブ+カード形式の一覧表示・コピー操作。ブラウザに常駐するパネル
  として表示する。002-side-panel-ui spec参照。旧popupのUIは廃止しsidepanelに統合済み）
- データ層: storageモジュール内の `ItemRepository` / `SettingsRepository`
- 依存方向: UI層 → データ層（一方向）

## インターフェース設計

### 入力

- `ItemRepository.list(): Promise<Item[]>`
- `SettingsRepository.get(): Promise<{ maskEnabled: boolean }>`
- コピー操作: `onCopyClick(itemId: string)`

### 出力

- 一覧表示行: `{ name: string(平文); displayValue: string(●8文字 または 平文) }[]`
- コピー成功時: `navigator.clipboard.writeText(item.value)` のPromise解決後、トースト通知を表示

## データモデル

既存の `items` / `settings` ストレージを参照のみ（本要件で新規ストレージキー追加なし）

## 処理フロー

1. sidepanel起動時、`ItemRepository.list()` と `SettingsRepository.get()` を並行取得する
2. `maskEnabled === true` の場合、各項目の value を固定8文字「●●●●●●●●」に置換して表示する。
   `false` の場合は平文表示する
3. コピーボタン押下時、対象itemのvalue(原文)を `navigator.clipboard.writeText()` に渡す
4. コピー成功時、100ms以内を目安にトースト通知を表示する

## エラーハンドリング

| エラー種別 | 対応方針 |
|-----------|---------|
| 登録項目0件 | 一覧に空状態(「未登録」)を表示する |
| `clipboard.writeText` 失敗（権限拒否等） | コピー失敗トーストを表示し、再試行を促す |
| `SettingsRepository.get()` 取得失敗 | `maskEnabled = true`（安全側）にフォールバックして表示する |

## テスト方針

ユニットテスト(vitest)を中心に以下を検証する:

- マスク表示ロジック（値の文字数に関わらず●8文字固定で表示されること）
- Clipboard APIをmockし、`writeText` 呼び出し引数が原文(マスクされていない値)と一致することを検証する
- 設定未保存の初期状態で `maskEnabled = true` として扱われることを検証する
