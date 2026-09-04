# Contract: 並び替えキーの判定（共有）

対象: `src/sidepanel/listReorder.js`（既存ファイルへの追加）

spec FR-005 / SC-005 は「項目カードとグループの縦リストで、並び替えに割り当てられたキーが**同一**」で
あることを求める。キーの値が2箇所に散ると乖離しうるため、判定を1箇所に置く。

`moveInList` と同じファイルに置くのは、どちらも「並び替えという操作の言語」に属する純粋な関数であり、
DOMにも `chrome` API にも依存しないため。

## 追加するエクスポート

```text
reorderOffsetFromKey(event: KeyboardEvent): -1 | 1 | null
isActivationKey(event: KeyboardEvent): boolean
```

既存の `moveInList(list, index, offset)` は変更しない。

---

## reorderOffsetFromKey(event)

キーイベントが並び替えの移動操作かを判定し、移動量を返す。

### 振る舞い

| 条件 | 戻り値 |
|------|--------|
| `event.altKey` が真 かつ `event.key === "ArrowUp"` | `-1` |
| `event.altKey` が真 かつ `event.key === "ArrowDown"` | `1` |
| 上記以外 | `null` |

`ctrlKey` / `metaKey` / `shiftKey` は判定に含めない（`Alt` の同時押しだけを見る）。

### テスト観点

- `Alt` + `ArrowUp` で `-1` を返す。
- `Alt` + `ArrowDown` で `1` を返す。
- `Alt` なしの `ArrowUp` / `ArrowDown` で `null` を返す。
- `Alt` + それ以外のキー（`ArrowLeft` / `Enter` / `a`）で `null` を返す。

---

## isActivationKey(event)

キーイベントが決定操作かを判定する。

### 振る舞い

`event.key` が `"Enter"` または `" "`（Space）のとき `true`、それ以外は `false`。

`Space` を含める理由: ネイティブのボタンは `Enter` と `Space` の双方で発火するため、
`tabindex="0"` の要素をボタン相当に見せるうえで両方受けるのが素直。
呼び出し側は `Space` のページスクロールを `preventDefault()` で抑止する責務を持つ。

### テスト観点

- `Enter` で `true` を返す。
- `" "`（Space）で `true` を返す。
- `Escape` / `Tab` / `ArrowUp` / `a` で `false` を返す。

---

## 呼び出し側

| 箇所 | 用途 |
|------|------|
| `src/sidepanel/groupPanel.js` の行の `keydown` | 既存の `event.key === "Enter" \|\| event.key === " "` と `event.altKey && ...` の直書き判定を、この2関数の呼び出しに置き換える |
| `src/sidepanel/sidepanel.js` のカードの `keydown` | 新規。同じ2関数を使う |

両方が同じ関数を通ることで、キーの同一性（spec FR-005）がコード上で保証される。

## 契約検証方法

**自動検証**: `tests/unit/listReorder.test.js` に上記のテスト観点を追加する。DOMに依存しないため
`KeyboardEvent` の代わりに `{ key, altKey }` の形のオブジェクトを渡してよい（関数はこの2つの
プロパティしか読まない）。
