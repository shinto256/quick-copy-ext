# spec-000003 - マスク表示切替機能

## 対象要件: req-000003

## 設計概要

`SettingsRepository` を介して `maskEnabled` 設定のトグルを実装する。切替は一覧の全項目に
即時反映し、chrome.storage.localに永続化する。

## アーキテクチャ

本機能は structure.yaml の UI層(popup)とデータ層(storage)の2層構成に従う。UI層はトグル
操作のみを持ち、永続化ロジックは持たない。データ層(storageモジュール)はRepositoryパターン
で実装し、chrome.storage.localへの読み書きをここに集約する（technical.yamlのdecision
「データアクセス層はRepositoryパターンで実装する」に準拠）。

## コンポーネント設計

- UI層: popup（マスク表示切替トグル。structure.yamlのmodules参照）
- データ層: storageモジュール内の `SettingsRepository`
- 依存方向: UI層 → データ層（一方向）

## インターフェース設計

### 入力

- `SettingsRepository.setMaskEnabled(value: boolean): Promise<void>`
- UIトグル操作: `onToggleMask()`

### 出力

- 更新後の設定: `{ maskEnabled: boolean }`
- popup側は更新結果を受け、一覧の全 `displayValue` を再計算し再描画する

## データモデル

chrome.storage.local キー `settings`: `{ maskEnabled: boolean }`（デフォルト `true`。
本要件で新規作成するストレージキー）

## 処理フロー

1. ユーザーがトグルUIを操作する
2. `onToggleMask()` が現在の `maskEnabled` を反転し `SettingsRepository.setMaskEnabled()` を呼ぶ
3. Repositoryが `chrome.storage.local.set` で永続化する
4. popup側が新しい `maskEnabled` をstateに反映し、一覧の全項目表示を200ms以内に再計算する

## エラーハンドリング

| エラー種別 | 対応方針 |
|-----------|---------|
| chrome.storage.local書き込み失敗 | 画面表示は切替済み状態を維持しつつ、次回起動時は保存済み値(切替前)に戻る可能性をトースト通知する |
| settings未初期化（初回起動） | `maskEnabled = true` として扱い、初回のトグル操作時に初期レコードを作成する |

## テスト方針

ユニットテスト(vitest)を中心に以下を検証する:

- `setMaskEnabled()` 呼び出し後、`get()` が更新値を返すことを検証する
- トグル操作1回で全項目の `displayValue` が切り替わることをUIロジック単体でテストする
- 再起動を模したテスト(storageから再読込)で、直前の設定値が保持されることを検証する
