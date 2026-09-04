# Contract: groupRepository の変更と追加関数

対象: `src/storage/groupRepository.js`

既存の `list` / `create` / `rename` のシグネチャは変更しない。`remove` は挙動を1点追加する。
`NAME_MAX_LENGTH` の値を変更し、関数を2つ追加する。

## 定数の変更

```text
NAME_MAX_LENGTH: 30 → 20
```

`validateName` は既存のまま `create` / `rename` の入力にのみ適用する。既に保存されている20文字超の
名前は検証も切り詰めもしない（FR-023）。

新しいストレージキーを追加する。

```text
const ORDER_KEY = "tabOrder";
```

---

## listTabOrder()

```text
listTabOrder(): Promise<string[]>
```

### 振る舞い

1. `getItem("groups", [])` と `getItem("tabOrder", [])` を読む。
2. `normalizeTabOrder(storedOrder, groups)` の結果を返す。
3. **書き込みは行わない**（正規化結果の永続化は `reorderTabs` / `remove` の責務）。

### 戻り値

正規化済みの並び順。事後条件は
[tab-order-contract.md](./tab-order-contract.md) の `normalizeTabOrder` と同じ。

### エラー

投げない。

### テスト観点

- `tabOrder` 未保存で `groups` が3件のとき、`["__unassigned__", g1, g2, g3]` を返す。
- `tabOrder` 未保存で `groups` が空のとき、`["__unassigned__"]` を返す。
- `tabOrder` に保存された順序がそのまま返る（未分類が先頭でない順序も保持される）。
- `tabOrder` に削除済みグループのIDが残っているとき、除去された結果が返る。
- `groups` に `tabOrder` 未収録のグループがあるとき、末尾に追加された結果が返る。
- 呼び出しても `chrome.storage.local` への書き込みが発生しない。

---

## reorderTabs(orderedTabIds)

```text
reorderTabs(orderedTabIds: string[]): Promise<string[]>
```

### 振る舞い

1. `listTabOrder()` で現在の正規化済み並び順を取得する。
2. `isValidTabOrder(orderedTabIds, 正規化済み並び順)` で検証する。`false` なら
   `ValidationError("orderedTabIds", "orderedTabIds must exactly match the current tabs")` を投げ、
   **保存は行わない**。
3. 妥当なら `setItem("tabOrder", [...orderedTabIds])` で保存する（1回の書き込み）。
4. 保存した配列を返す。

### エラー

| ケース | 対応 |
|--------|------|
| 要素数が現在のタブ数と異なる | `ValidationError` を投げる |
| 重複IDを含む | `ValidationError` を投げる |
| 現在存在しないIDを含む | `ValidationError` を投げる |
| `"__unassigned__"` が欠けている | `ValidationError` を投げる（要素数または集合の条件で検出される） |
| 配列でない値 | `ValidationError` を投げる |

検証に失敗した場合、呼び出し側（`groupPanel`）はエラーを表示し `listTabOrder()` から再描画する
（FR-018）。

### テスト観点

- 現在のタブを並び替えた配列を渡すと、その順序で `tabOrder` が保存され、戻り値が一致する。
- 未分類を先頭以外の位置に置いた配列も保存できる（FR-010）。
- 要素数が足りない配列を渡すと `ValidationError` が投げられ、`tabOrder` が変化しない。
- 重複を含む配列を渡すと `ValidationError` が投げられ、`tabOrder` が変化しない。
- 存在しないIDを含む配列を渡すと `ValidationError` が投げられ、`tabOrder` が変化しない。
- `"__unassigned__"` を除いた配列を渡すと `ValidationError` が投げられる。
- 保存後に `listTabOrder()` を呼ぶと、保存した順序がそのまま返る。
- `groups` を変更していないこと（`reorderTabs` は `groups` に書き込まない）。

---

## remove(id)（既存・挙動を1点追加）

```text
remove(id: string): Promise<void>
```

### 変更後の振る舞い

1. `list()` で `groups` を取得し、`id` が存在しなければ `NotFoundError(id)` を投げる（既存のまま）。
2. `removeByGroup(id)` で所属項目を削除する（既存のまま）。
3. `groups` から該当グループを取り除いて保存する（既存のまま）。
4. **追加**: `getItem("tabOrder", [])` から `id` を除去して `setItem("tabOrder", ...)` で保存する。

手順4を行う理由は、作成と削除を繰り返したときに実在しないIDが保存データに蓄積するのを防ぐため。
表示上は `listTabOrder()` の正規化で除去されるため、手順4を省いても表示は壊れない。

### エラー

既存のまま。存在しない `id` に対して `NotFoundError`。

### テスト観点

- グループを削除すると `tabOrder` から該当IDが除去される。
- 削除したグループの所属項目も削除される（既存挙動が維持されている）。
- `tabOrder` 未保存の状態で削除してもエラーにならない。
- 存在しない `id` を指定すると `NotFoundError` が投げられ、`tabOrder` が変化しない。
- 未分類（`"__unassigned__"`）は `groups` に存在しないため `remove` の対象にならない（`NotFoundError`）。

---

## create(name)（既存・変更なし）

`tabOrder` への書き込みは**行わない**。`listTabOrder()` の正規化ルール4により、新規グループは
自動的に末尾へ配置される（FR-019）。

### 追加するテスト観点

- 新規作成したグループが `listTabOrder()` の末尾に現れる。
- `create` が `tabOrder` キーに書き込まない。
- 21文字の名前で `ValidationError` が投げられる（`NAME_MAX_LENGTH` が20であること）。
- 20文字の名前は作成できる。

---

## rename(id, name)（既存・変更なし）

`tabOrder` は変化しない（IDが変わらないため）。

### 追加するテスト観点

- 21文字の名前で `ValidationError` が投げられる。
- 20文字の名前へ変更できる。
- 既に25文字の名前で保存されているグループに対して、`rename` で21文字を指定すると
  `ValidationError` が投げられる（既存の長さは検証をすり抜けるが、変更時は新上限が適用される）。
- `rename` の前後で `listTabOrder()` の順序が変化しない。
