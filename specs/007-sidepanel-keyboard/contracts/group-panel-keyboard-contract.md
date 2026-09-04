# Contract: 全グループパネルのキーボード操作と項目登録フォームのUI契約

対象: `src/sidepanel/groupPanel.js`、`src/sidepanel/sidepanel.js`、`src/sidepanel/sidepanel.css`

`006-group-navigation` の
[contracts/group-panel-ui-contract.md](../../006-group-navigation/contracts/group-panel-ui-contract.md)
に対する追加分。既存のポインタ操作の挙動は変更しない（spec FR-006 / SC-008）。

---

## 1. 縦リストの行（`groupPanel.js`）

### 行の属性

`createRow(tabId)` が生成する `<li class="group-row">` に以下を追加する。

| 属性 | 値 | 根拠 |
|------|-----|------|
| `tabindex` | `"0"` | 各行を1つのタブストップにする（spec FR-001 / FR-005） |
| `role` | 付けない | 矢印単独をリスト内移動に割り当てないため、`listbox` / `option` の期待と合わない（[research.md](../research.md) R-001） |
| `aria-label` | 付けない | 行内のテキスト（グループ名・件数）がそのまま読み上げ対象になる |

インライン編集中の行（`createInputRow` が生成する `<li class="group-row group-row-editing">`）には
`tabindex` を付けない。内部の入力欄が独自にフォーカスを受けるため。

**フォーカス表現は追加しない。** 既存のグローバルな `:focus-visible`（`sidepanel.css`）が
そのまま適用される（spec FR-002 / SC-007）。

### 行の keydown

行に対する `keydown` を1箇所で受ける（`#group-panel-list` の委譲でよい）。
`event.target.closest(".group-row")` で対象行を特定し、以下を処理する。

| キー | 条件 | 挙動 |
|------|------|------|
| `Enter` | 行にフォーカスがある（`event.target` が行自身） | `preventDefault()`。そのグループへ切り替えてパネルを閉じる（既存の `activateTab` を呼ぶ） |
| `Space` | 同上 | 同上。`preventDefault()` でページスクロールを抑止する |
| `Alt` + `↑` | 行にフォーカスがあり、かつ並び替えが有効 | `preventDefault()`。その行を1つ上へ移動する |
| `Alt` + `↓` | 同上 | `preventDefault()`。その行を1つ下へ移動する |

**`event.target` が行自身でない場合（三点リーダー・入力欄など行の内側の要素）は何もしない。**
これにより、インライン編集の入力欄での `Alt` + 矢印や `Enter` が並び替え・切替として解釈されない
（spec FR-004 / FR-014）。入力欄の `Enter`（確定）・`Escape`（取消）は既存実装のまま。

### 並び替えが有効な条件

既存の `canReorder()` をそのまま使う。

```text
canReorder() === true  ⟺  絞り込みが空 かつ インライン編集中でない かつ 入力行が表示されていない
```

`canReorder()` が `false` の間は `Alt` + 矢印で並び替えを行わない（spec FR-012 / FR-013）。
ドラッグ操作と条件が一致する。

### キーボードによる移動の処理

1. 対象行の `data-tab-id` から、現在の並び順（`groupPanel` が保持する `tabOrder`）内の位置を求める。
2. `moveInList(tabOrder, index, offset)`（[list-reorder-contract.md](./list-reorder-contract.md)）で
   新しい並び順を作る。
3. 新しい並び順が元と同じ（境界に達していた）場合は、**何もしない**。保存もエラー表示も行わない
   （spec FR-011）。
4. `GroupRepository.reorderTabs(新しい並び順)` で永続化する。
5. 成功したら保持している `tabOrder` を更新し、縦リストを再描画してタブバーを再描画する
   （spec FR-008 / FR-015）。
6. 再描画後、`data-tab-id` が一致する行を探して `focus()` する（spec FR-009。
   [research.md](../research.md) R-003）。
7. 失敗したら既存の並び替えエラー処理と同じくエラーを表示し、保存済みの順序から再描画したうえで、
   同じ `data-tab-id` の行へフォーカスを戻す（spec FR-016）。

永続化とエラー処理は既存の `handleReorder` と同じ流れになるため、**共通の処理に寄せる**
（キーボード経路とドラッグ経路で「並び順配列を渡すと保存・再描画・エラー処理をする」関数を共有し、
フォーカス復帰の有無だけを引数で分ける）。

---

## 2. 全グループパネルのフォーカストラップ（`groupPanel.js`）

- 初期化時に `createFocusTrap(overlayEl, { fallbackFocus: () => タブバー末尾のパネルを開くボタン })`
  を作る。ボタンは `renderTabs()` のたびに作り直されるため、**要素の参照ではなくセレクタで
  都度取得する関数**を渡す。
- `open()` の中で `activate(document.activeElement)` を呼ぶ。既存の「絞り込み入力へフォーカス」は
  そのまま維持する（`activate` はフォーカスを動かさない）。
- `close()` の中で `deactivate()` を呼ぶ。これによりフォーカスが開く前の要素へ戻る
  （spec FR-018 / FR-019）。
- 行のタップ・決定キーによるグループ切替も `close()` を通るため、同じ復帰処理が働く。

### `Escape` の優先順位（既存の挙動を維持）

1. インライン編集の入力欄にフォーカスがある → 編集を取消す。パネルは閉じない（spec FR-021）
   ※入力欄の `keydown` が `stopPropagation()` するため `document` のハンドラに届かない（既存実装）
2. 行メニューが開いている → メニューを閉じる（既存実装）
3. それ以外 → パネルを閉じる（既存実装）

---

## 3. 項目登録フォーム（`sidepanel.js`）

### 追加する挙動

- 初期化時に `createFocusTrap(formOverlay, { fallbackFocus: () => 項目追加ボタン })` を作る。
  項目追加ボタン（`#add-item-button`）は再描画されないため、セレクタで取得すればよい。
- `openItemForm()` の末尾で `activate(document.activeElement)` を呼ぶ。既存の
  `nameField.focus()` はそのまま維持する。
- `closeItemForm()` の中で `deactivate()` を呼ぶ。
- `document` の `keydown` で `Escape` を受け、フォームが開いている間（`isFormOpen === true`）は
  `closeItemForm()` を呼ぶ（spec FR-020）。既存の `closeItemForm()` は `form.reset()` を行うため、
  入力内容は保存されない（US3 シナリオ6）。
- 全グループパネルと項目登録フォームが同時に開くことはない（パネルの行から項目フォームを開く経路がない）。
  そのため `Escape` のハンドラ同士が競合しない。

### 変更しないもの

- 保存・キャンセルボタンの挙動、バリデーション、グループ選択の内容。
- `document.visibilityState === "hidden"` のときの既存処理（`sidepanel.js` の該当箇所）。

---

## 4. CSS（`sidepanel.css`）

- **フォーカス表現は追加しない**（既存の `:focus-visible` を使う。spec FR-002）。
- 行にフォーカスしたときにフォーカスリングが隣の行に隠れないよう、`.group-row:focus-visible` に
  重なり順の指定のみを追加する。`box-shadow` で描くリングは要素の外側へ広がるため、
  後続の行の背景に隠れる可能性がある。

```text
.group-row:focus-visible {
  position: relative;
  z-index: 1;
}
```

`.group-row.dragging` は `z-index: 2` なので、ドラッグ中の行より下に来る。順序関係は保たれる。

---

## 契約検証方法

- **自動検証**: `src/sidepanel/listReorder.js` はユニットテスト対象
  （[list-reorder-contract.md](./list-reorder-contract.md)）。
- **手動検証**: 行のフォーカス・キーイベント処理・フォーカストラップは、既存specと同方針で
  ユニットテスト対象外とし、[quickstart.md](../quickstart.md) の手順で確認する。
  特に**既存のポインタ操作に回帰がないこと**（spec SC-008）を必ず確認する。
