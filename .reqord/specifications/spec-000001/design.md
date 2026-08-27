# spec-000001 - 項目登録・保存機能

## 対象要件: req-000001

## 設計概要

popup/optionsから呼び出す `ItemRepository`(storageモジュール)を実装し、chrome.storage.localへの
項目登録・保存を担う。バリデーション(文字数・登録上限500件)はRepository層で実施する。

## アーキテクチャ

本機能は structure.yaml の UI層(popup/options)とデータ層(storage)の2層構成に従う。UI層は
イベントハンドリング・表示ロジックのみを持ち、永続化ロジックは持たない。データ層(storage
モジュール)はRepositoryパターンで実装し、chrome.storage.localへのアクセスをここに集約する
（technical.yamlのdecision「データアクセス層はRepositoryパターンで実装する」に準拠）。

## コンポーネント設計

- UI層: popup（新規登録フォーム。structure.yamlのmodules参照）
- データ層: storageモジュール内の `ItemRepository`（本spec インターフェース設計を参照）
- 依存方向: UI層 → データ層（一方向。データ層からUI層への依存は発生しない）

## インターフェース設計

### 入力

`ItemRepository.create(input: { name: string; value: string; groupId?: string | null }): Promise<Item>`

- name: 1〜50文字
- value: 1〜2000文字
- groupId: 省略時 null（未分類。実データ投入は spec-000004 で行う）

### 出力

`Item`: `{ id: string; name: string; value: string; groupId: string | null; createdAt: string; updatedAt: string }`

- 成功時: 作成された Item を返す
- 失敗時: `ValidationError`（理由コード付き）を throw する

## データモデル

chrome.storage.local キー `items`: `Item[]`（本要件で新規作成するストレージキー）

## 処理フロー

1. UIから name, value, (groupId) を受け取り `ItemRepository.create()` を呼ぶ
2. Repository内でバリデーション: name長・value長・現在件数(<500)をチェックする
3. 検証OKならID採番し items に追加、`chrome.storage.local.set` で永続化する
4. 呼び出し元(popup)へ作成結果を返し、一覧を再描画する

## エラーハンドリング

| エラー種別 | 対応方針 |
|-----------|---------|
| 名前が空、または51文字以上 | `ValidationError("name")` を throw し、保存せず一覧は0件変化なし |
| 値が空、または2001文字以上 | `ValidationError("value")` を throw し、保存せず一覧は0件変化なし |
| 登録件数が500件に到達している状態での追加 | `ValidationError("limit")` を throw し、保存を拒否し上限到達をUIに通知する |
| chrome.storage.local書き込み失敗 | `StorageError` を throw し、UIにエラー表示のうえ再試行を促す |

## テスト方針

ユニットテスト(vitest + chrome.storage.local mock)を中心に以下を検証する:

- 境界値テスト（name: 0/1/50/51文字、value: 0/1/2000/2001文字）
- 登録上限のテスト（499→500件目は成功、501件目は拒否）
- 正常系: `create()` 呼び出し後、戻り値のItemが入力どおりのフィールドを持つことを確認する
