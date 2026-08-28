# Contract: itemRepository 追加関数

対象: `src/storage/itemRepository.js`（既存の`list`/`create`/`update`/`remove`/`reassignGroup`は
変更しない。以下2関数を追加する）

## reorderGroup(groupId, orderedIds)

```text
reorderGroup(groupId: string | null, orderedIds: string[]): Promise<Item[]>
```

### 振る舞い

1. `list()`で現在の全項目を取得する。
2. `groupId`に属する項目（`groupId === null`の場合は`item.groupId === null`の項目）のID集合を
   算出する。
3. その集合と`orderedIds`の集合が完全一致しない場合（過不足・重複がある場合）、
   `ValidationError("orderedIds", ...)`を投げ、`items`は変更しない。
4. 一致する場合、元の`items`配列を先頭から走査し、`groupId`が一致する要素に出会うたびに
   `orderedIds`の先頭から順に対応する項目に差し替える（他グループの項目はそのままの位置に残す）。
5. 更新後の配列を`setItem("items", ...)`で永続化し、更新後の`Item[]`全体を返す。

### エラー

| ケース | エラー |
|--------|--------|
| `orderedIds`に対象グループ外のIDが含まれる、または対象グループの一部IDが欠けている | `ValidationError` |

### テスト観点

- 3項目(同一グループ)の順序を逆転させると、`list()`の結果がその順序で返る。
- 対象グループ以外の項目の相対順序が変化しないこと。
- `orderedIds`が対象グループの項目集合と一致しない場合、`ValidationError`を投げ、`items`が
  変更されないこと。

## removeMany(ids)

```text
removeMany(ids: string[]): Promise<void>
```

### 振る舞い

1. `list()`で現在の全項目を取得する。
2. `ids`に含まれるIDと一致する項目を除いた新しい配列を作る（存在しないIDは無視する）。
3. 新しい配列を`setItem("items", ...)`で永続化する（1回の書き込み）。

### テスト観点

- 複数IDを指定して削除すると、該当項目のみが`list()`の結果から消え、未指定の項目は残る。
- 存在しないIDを含めて呼び出してもエラーにならず、他の項目は影響を受けない。
- 空配列を指定した場合、`items`に変化がないこと。

## removeByGroup(groupId)（req-000004 v1.1対応・実装済み）

```text
removeByGroup(groupId: string | null): Promise<void>
```

グループ削除時のカスケード削除（req-000004 v1.1: グループ削除時は所属項目もまとめて削除する）
のために`removeMany()`を内部利用する関数。指定した`groupId`に一致する項目をすべて`removeMany()`
経由で削除する。`groupRepository.remove()`から呼び出される。本specの計画・タスク作成後に、
req-000004の仕様変更に対応するため先行実装済み。

### テスト観点

- 指定グループに属する項目のみが削除され、他グループ・未分類の項目は残ること。
