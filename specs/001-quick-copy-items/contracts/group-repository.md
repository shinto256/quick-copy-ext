# Contract: GroupRepository

UI層（popup / options）とデータ層（storage）の境界インターフェース。実装は `src/storage/groupRepository.js`。

## `list(): Promise<Group[]>`

- 登録済み全グループを返す
- 対応: US4

## `create(name: string): Promise<Group>`

- `name`（1〜30文字）をバリデーションのうえ新規Groupを作成する
- 現在のグループ数が50件の場合は拒否する
- 失敗時: `ValidationError("name" | "limit")` をthrowする
- 対応: FR-010, FR-011, US4

## `rename(id: string, name: string): Promise<Group>`

- 指定Groupの名前を変更する（`create`と同じ名前バリデーションを適用）
- 対象IDが存在しない場合は `NotFoundError` をthrowする
- 対応: FR-010, US4

## `remove(id: string): Promise<void>`

- 指定Groupを削除する
- 削除前に `ItemRepository.reassignGroup(id, null)` を呼び出し、所属Itemを「未分類」に
  更新してからGroup自体を削除する
- 対応: FR-013, US4
