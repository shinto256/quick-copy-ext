# Contract: itemRepository 追加関数

対象: `src/storage/itemRepository.js`（既存の`list`/`create`/`update`/`remove`/`removeMany`/
`removeByGroup`/`reorderGroup`は変更しない。以下1関数を追加する）

## updateGroupMany(ids, groupId)

```text
updateGroupMany(ids: string[], groupId: string | null): Promise<Item[]>
```

### 振る舞い

1. `list()`で現在の全項目を取得する。
2. `ids`の集合を作り、各項目についてIDが集合に含まれる場合のみ`groupId`と`updatedAt`を更新する。
3. 対象項目は、既存`update()`のグループ変更時の挙動と同じく、更新後の配列内で変更先グループの
   末尾に配置されるよう並べ替える（元の位置から取り除き、末尾に追加）。複数対象項目間の相対順序は
   `ids`配列の順序を維持する。
4. 更新後の配列を`setItem("items", ...)`で永続化する（1回の書き込み）。
5. 更新後の`Item[]`全体を返す。

### エラー

| ケース | 対応 |
|--------|------|
| `ids`に存在しないIDが含まれる | エラーにせず無視する（選択後に他操作で先に削除された場合に対応） |
| `ids`が空配列 | 何も更新せず、現在の`items`をそのまま返す |

### テスト観点

- 異なるグループに属する複数項目のIDを指定してグループ変更すると、指定項目のみ`groupId`が
  変更先に揃い、`list()`の結果で変更先グループの末尾に並ぶこと。
- 指定しなかった項目の`groupId`・相対順序が変化しないこと。
- 存在しないIDを含めて呼び出してもエラーにならず、他の項目は影響を受けないこと。
- 空配列を指定した場合、`items`に変化がないこと。
- `groupId`に`null`(未分類)を指定した場合も同様に一括更新できること。
