# Contract: dragReorder への handleSelector 追加

対象: `src/sidepanel/dragReorder.js`（既存ファイルへのオプション追加）

`006-group-navigation` の
[contracts/drag-reorder-contract.md](../../006-group-navigation/contracts/drag-reorder-contract.md)
に対する追加分。既存の呼び出し側は指定しなければ挙動が変わらない（後方互換）。

## 追加する Option

```text
{
  ...既存のオプション,
  handleSelector?: string,   // ドラッグを開始できる要素のセレクタ。省略時は行全体
}
```

---

## handleSelector の振る舞い

### 指定した場合

`pointerdown` の対象が `handleSelector` に一致する要素（またはその子孫）の上で起きたときだけ、
その操作をドラッグの候補として扱う。一致しない場所を押した場合は**タップの候補としてのみ**扱う。

| 押した場所 | 閾値未満で離した | 閾値を超えて動かした |
|-----------|----------------|-------------------|
| `handleSelector` に一致 | 何も起こさない（`onActivate` を呼ばない） | ドラッグを開始する |
| 行内のそれ以外（`ignoreSelector` を除く） | `onActivate(row)` を呼ぶ | 何も起こさない（`onReorder` も `onActivate` も呼ばない） |
| `ignoreSelector` に一致 | 何もしない（`pointerdown` を無視する） | 同左 |

`canDrag()` の判定は従来どおり、閾値を超えた時点で行う。`handleSelector` に一致する場所からの
操作で `canDrag()` が `false` の場合はドラッグを開始せず、その操作を無効化する。

### 省略した場合

従来どおり、行のどこを押してもドラッグの候補になり、閾値未満で離せば `onActivate` を呼ぶ。
**既存の呼び出し側（グループの縦リスト）の挙動は変わらない。**

---

## 実装上の要点

- `pointerdown` の時点で `event.target.closest(handleSelector)` を評価し、結果を `pending` に
  保持する（例: `fromHandle: boolean`）。`pointermove` のたびに再評価しない。
- 閾値を超えたときの分岐:
  - `handleSelector` が未指定、または `fromHandle` が真 → 従来どおり `canDrag()` を評価して
    ドラッグ開始
  - `handleSelector` が指定済みで `fromHandle` が偽 → その操作を無効化する（`pointerup` でも
    `onActivate` を呼ばない）
- 閾値未満で離したときの分岐:
  - `handleSelector` が未指定、または `fromHandle` が偽 → `onActivate(row)` を呼ぶ
  - `handleSelector` が指定済みで `fromHandle` が真 → 何もしない
- `ignoreSelector` の判定は従来どおり `pointerdown` の入口で行う。`handleSelector` より先に評価する
  （行内のボタンは掴み手の判定に入る前に除外される）。

---

## 呼び出し側

| 箇所 | `handleSelector` | 理由 |
|------|-----------------|------|
| `src/sidepanel/sidepanel.js`（項目カード） | `".item-card-handle"` | カード本体を押す操作はコピーに割り当てられており、誤って並び替わるのを防ぐ（spec FR-006 / FR-008） |
| `src/sidepanel/groupPanel.js`（グループの縦リスト） | 指定しない | 行を押す操作はグループの切替で、誤操作の代償が小さい。行全体で掴める現在の操作性を維持する（spec FR-014） |

---

## 契約検証方法

DOM操作が中心のため、既存specと同方針でユニットテスト対象外とする。
[quickstart.md](../quickstart.md) の手動検証シナリオで以下を確認する。

- 掴み手を押してドラッグすると並び替えが始まる
- 掴み手を押して動かさずに離すと何も起きない
- カード本体を押して動かすと並び替えが始まらず、離しても何も起きない
- カード本体を押して動かさずに離すと値がコピーされる
- 行内のボタン（コピー・三点リーダー・チェックボックス）は従来どおり動く
- **グループの縦リストは行のどこを押してもドラッグでき、タップで切替できる**（後方互換）
