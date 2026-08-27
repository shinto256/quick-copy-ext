# Contract: ItemRepository

UI層（popup / options）とデータ層（storage）の境界インターフェース。実装は `src/storage/itemRepository.js`。

## `list(): Promise<Item[]>`

- 登録済み全項目を返す（0件の場合は空配列）
- 対応: FR-004, US2

## `create(input: { name: string; value: string; groupId?: string | null }): Promise<Item>`

- `name`（1〜50文字）・`value`（1〜2000文字、複数行可）をバリデーションのうえ新規Itemを作成する
- 現在の登録件数が500件の場合は拒否する
- 成功時: 作成されたItemを返す
- 失敗時: `ValidationError("name" | "value" | "limit")` をthrowする
- 対応: FR-001, FR-002, FR-003, US1

## `update(id: string, patch: { name?: string; value?: string; groupId?: string | null }): Promise<Item>`

- 指定Itemの名前・値・所属グループを更新する（`create`と同じバリデーションルールを適用）
- 対象IDが存在しない場合は `NotFoundError` をthrowする
- 対応: FR-014, FR-012, US1, US4

## `remove(id: string): Promise<void>`

- 指定Itemを削除する
- 対応: FR-015, US1

## `reassignGroup(groupId: string, toGroupId: null): Promise<void>`

- 指定 `groupId` を持つ全Itemの `groupId` を `toGroupId`（常に `null`）に一括更新する
- `GroupRepository.remove()` から呼び出される（FR-013, US4）
