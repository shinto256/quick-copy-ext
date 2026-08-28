# spec-000004 - グループ管理機能

## 対象要件: req-000004

## 設計概要

`GroupRepository` を新設し、グループのCRUDと `items` への `groupId` 割当を実装する。
一覧はグループ単位で絞り込み表示できる。前提: 1項目が所属できるグループは1つ（グループの
階層化は対象外）。

## アーキテクチャ

本機能は structure.yaml の UI層(sidepanel)とデータ層(storage)の2層構成に従う。UI層は
グループ選択・絞り込み・作成・編集・削除の各操作のみを持ち、永続化ロジックは持たない。
データ層(storageモジュール)はRepositoryパターンで実装し、chrome.storage.localへの読み書き
をここに集約する（technical.yamlのdecision「データアクセス層はRepositoryパターンで実装する」
に準拠）。

## コンポーネント設計

- UI層: sidepanel（グループをタブとして表示・絞り込み。タブからの新規作成、タブのケバブ
  メニューからの名称編集・削除まで、すべて同一パネル内で画面遷移なく完結する。
  002-side-panel-ui spec参照。旧popup/optionsのUIは廃止しsidepanelに統合済み）
- データ層: storageモジュール内の `GroupRepository` / `ItemRepository`
- 依存方向: UI層 → データ層（一方向）

## インターフェース設計

### 入力

- `GroupRepository.create(name: string): Promise<Group>`
- `GroupRepository.rename(id: string, name: string): Promise<Group>`
- `GroupRepository.delete(id: string): Promise<void>`
- `ItemRepository.update(id: string, patch: { groupId: string | null }): Promise<Item>`
  （spec-000001で定義したRepositoryにgroupId更新機能を追加する）
- UI: `onFilterByGroup(groupId: string | null)`

### 出力

- `Group`: `{ id: string; name: string }`
- 一覧フィルタ結果: `groupId` が一致する `Item[]`（未分類フィルタは `groupId === null` で抽出）

## データモデル

chrome.storage.local キー `groups`: `Group[]`（本要件で新規追加するストレージキー）

既存 `items` の `groupId` フィールド（spec-000001で型定義済み、常時 `null` だったもの）に
実データを投入する

## 処理フロー

1. ユーザーがグループ作成UIで名前を入力し `GroupRepository.create()` を呼ぶ
2. バリデーション（名前1〜30文字、グループ数<50）を通過後 `groups` に追加する
3. 項目編集時にグループを選択し `ItemRepository.update()` で `items` の `groupId` を更新する
4. 一覧画面でグループ選択時、`items.filter(i => i.groupId === selectedGroupId)` で300ms以内に絞り込み表示する
5. グループ削除時、そのgroupIdを持つ全itemsの `groupId` を `null` に更新してから該当グループを
   `groups` から削除する

## エラーハンドリング

| エラー種別 | 対応方針 |
|-----------|---------|
| グループ名が空、または31文字以上 | `ValidationError("name")` を throw し、作成・変更を拒否する |
| グループ数が50件に到達している状態での追加 | `ValidationError("limit")` を throw し、作成を拒否し上限到達を通知する |
| 削除対象グループが存在しない | `NotFoundError` を throw し、UIにエラー表示する |

## テスト方針

ユニットテスト(vitest)を中心に以下を検証する:

- グループ名の境界値（1/30/31文字）
- グループ数上限のテスト（49→50件目は成功、51件目は拒否）
- グループ削除後、旧所属itemsの `groupId` が100%(全件) `null` に更新されることを検証する
  （データ欠損0件）
- グループ未選択時（フィルタなし）は全item(未分類含む)が表示されることを検証する
