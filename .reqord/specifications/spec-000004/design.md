# spec-000004 - グループ管理機能

## 対象要件: req-000004

## 設計概要

`GroupRepository` を新設し、グループのCRUDと `items` への `groupId` 割当を実装する。
一覧はグループ単位で絞り込み表示できる。前提: 1項目が所属できるグループは1つ（グループの
階層化は対象外）。**グループ削除時は、所属する項目もまとめて削除する**（未分類への退避は
行わない。req-000004 v1.1準拠）。

## アーキテクチャ

本機能は structure.yaml の UI層(sidepanel)とデータ層(storage)の2層構成に従う。UI層は
グループ選択・絞り込み・作成・編集・削除の各操作のみを持ち、永続化ロジックは持たない。
データ層(storageモジュール)はRepositoryパターンで実装し、chrome.storage.localへの読み書き
をここに集約する（technical.yamlのdecision「データアクセス層はRepositoryパターンで実装する」
に準拠）。

## コンポーネント設計

- UI層: sidepanel（グループをタブとして表示・絞り込み。タブからの新規作成、タブのケバブ
  メニューからの名称編集・削除まで、すべて同一パネル内で画面遷移なく完結する。削除操作は
  確認ダイアログを経てから確定する。002-side-panel-ui spec参照。旧popup/optionsのUIは廃止し
  sidepanelに統合済み）
- データ層: storageモジュール内の `GroupRepository` / `ItemRepository`
- 依存方向: UI層 → データ層（一方向）

## インターフェース設計

### 入力

- `GroupRepository.create(name: string): Promise<Group>`
- `GroupRepository.rename(id: string, name: string): Promise<Group>`
- `GroupRepository.delete(id: string): Promise<void>`
  （**変更**: 削除対象グループに所属する全項目も内部で削除する。項目の`groupId`をnullへ
  更新する処理は行わない）
- `ItemRepository.update(id: string, patch: { groupId: string | null }): Promise<Item>`
  （spec-000001で定義したRepositoryにgroupId更新機能を追加する。手動でのグループ変更
  （項目編集時の変更）はこれまで通り項目を削除しない）

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
   （この操作では項目は削除されない）
4. 一覧画面でグループ選択時、`items.filter(i => i.groupId === selectedGroupId)` で300ms以内に絞り込み表示する
5. グループ削除操作は確認ダイアログを経てから確定する。承認されると、`GroupRepository.delete()`が
   そのgroupIdを持つ全itemsを`items`配列から除去したうえで、該当グループを`groups`から削除する
   （1回の永続化操作でまとめて行う）

## エラーハンドリング

| エラー種別 | 対応方針 |
|-----------|---------|
| グループ名が空、または31文字以上 | `ValidationError("name")` を throw し、作成・変更を拒否する |
| グループ数が50件に到達している状態での追加 | `ValidationError("limit")` を throw し、作成を拒否し上限到達を通知する |
| 削除対象グループが存在しない | `NotFoundError` を throw し、UIにエラー表示する |
| グループ削除の確認ダイアログでキャンセルされた場合 | `GroupRepository.delete()` を呼ばず、グループ・所属項目とも変更しない |

## テスト方針

ユニットテスト(vitest)を中心に以下を検証する:

- グループ名の境界値（1/30/31文字）
- グループ数上限のテスト（49→50件目は成功、51件目は拒否）
- グループ削除後、旧所属itemsの100%が`items`から削除されていることを検証する
  （未削除の項目は0件。他グループ・未分類の項目には影響しないことも検証する）
- グループ未選択時（フィルタなし）は全item(未分類含む)が表示されることを検証する
- 項目編集によるグループ変更（削除ではない）では、項目自体が削除されないことを検証する
  （`GroupRepository.delete()`との挙動の違いを明確化する回帰テスト）
