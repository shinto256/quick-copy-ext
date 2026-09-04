# Phase 0: Research — 項目並び替え操作の統一

**Feature**: `008-item-reorder-unification` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

spec の Assumptions で計画フェーズ送りとした項目を決定する。本featureは `007-sidepanel-keyboard`
で作った部品を項目カードへ広げるもので、新しい方式の選択はほとんどない。

---

## R-001: キーの割り当て

**Decision**: グループの縦リストと同一にする。

| 操作 | キー |
|------|------|
| フォーカスしたカードの値をコピーする | `Enter` / `Space` |
| フォーカスしたカードを1つ上へ移動する | `Alt` + `↑` |
| フォーカスしたカードを1つ下へ移動する | `Alt` + `↓` |

**Rationale**: spec FR-005 が「グループの縦リストと同一」と定めている。根拠は
`specs/007-sidepanel-keyboard/research.md` の R-002 を参照（`Alt` + 矢印は行を移動させる操作の
一般的な慣習で、ブラウザの `Alt` + `←` / `→` と衝突しない）。

**Alternatives considered**: なし。本specで独自に定めない前提（spec Assumptions）。

---

## R-002: カードをフォーカス可能にする手段

**Decision**: `.item-card`（`<li>`）に `tabindex="0"` を付与する。`role` は付けない。
カードごとに1つのタブストップとし、コピーボタン・三点リーダーは従来どおり個別のタブストップとする。

**Rationale**:

- グループの縦リストの行と同じ方式（`specs/007-sidepanel-keyboard/research.md` R-001）。
  同じ見た目・同じ操作にするため、方式を揃えるのが素直。
- カードの中にコピーボタンと三点リーダーの `<button>` が入るため、カード全体を `<button>` で
  包むことはできない（ボタンの入れ子になる）。
- フォーカス表示は既存のグローバルな `:focus-visible` が要素を問わず適用されるため、
  フォーカス可能にするだけで spec SC-007（グループの行および既存のボタンと同一の見た目）が成立する。

**Note**: `dragReorder` はカードの `pointerdown` で `preventDefault()` を行っているため、
**カードをポインタで押してもフォーカスは移らない**。押した場合は値がコピーされるため実害はなく、
グループの縦リストと同じ扱い（spec Assumptions に記載済み）。

---

## R-003: キーボード処理をグループ側と共通化するか

**Decision**: **共通化しない。** `sidepanel.js` にカード用の `keydown` ハンドラを置き、
`groupPanel.js` のものとは別に書く。共通化するのは既存の純関数 `moveInList` のみ。

**Rationale**:

- 両者は「フォーカスした要素を上下に動かす」点だけが同じで、周辺が異なる。
  - 無効化の条件: グループは「絞り込みが空 かつ インライン編集中でない」、カードは
    「検索が空 かつ 選択モードでない」
  - 決定キーの結果: グループは切替してパネルを閉じる、カードは値をコピーする
  - 並び順の情報源: グループは `tabOrder`（未分類を含む全タブ）、カードは表示中の項目IDの配列
  - 永続化: グループは `reorderTabs`、カードは `reorderGroup`（グループ単位の並び替え）
  - フォーカス復帰の鍵: グループは `data-tab-id`、カードは `data-item-id`
- 共通化すると、これらすべてを引数やコールバックで外から与える形になり、呼び出し側が
  「何を渡すか」を読み解く手間の方が大きくなる。実際に共通なのは
  `moveInList`（既にファイルとして切り出し済み）と「境界なら何もしない」という判定だけ。
- 一方で**キーの定義は1箇所にまとめる**。同一であることが spec FR-005 / SC-005 の条件なので、
  値が2箇所に散ると乖離しうる。

**Alternatives considered**:

- **`attachKeyboardReorder(container, options)` として汎用化**: 上記のとおり差異が多く、
  オプションが6つ以上になる。`dragReorder` のように「ポインタイベントの扱い」という
  それ自体が複雑な関心を隠す場合は汎用化の価値があるが、本件は数行の分岐であり見返りが薄い。
- **完全に別々に書く（キーの値も別々に持つ）**: FR-005 の同一性が保証できない。

**Constraint for implementation**: 並び替えと決定に使うキーの判定は共有できる形にする
（[contracts/reorder-keys-contract.md](./contracts/reorder-keys-contract.md)）。

---

## R-004: 並び順の情報源とフォーカス復帰の鍵

**Decision**: 並び順は既存の `getVisibleItemIds()`（表示中のカードの `data-item-id` を DOM順に
集める関数。`sidepanel.js` に既存）を使う。永続化は既存の `persistReorder(orderedIds)` を使う。
再描画後のフォーカス復帰は `data-item-id` を鍵にカードを再取得する。

**Rationale**:

- `getVisibleItemIds()` と `persistReorder()` は既存の `▲▼`（`moveItem`）とドラッグ経路の
  双方が使っている関数。キーボード経路も同じものを使えば、並び替えの永続化の経路が1つに保たれる。
- `persistReorder()` は内部で `renderList()` を呼びカードを作り直すため、移動前の要素へは
  フォーカスを戻せない。`data-item-id` は再描画をまたいで同じ項目を一意に指す。
  グループ側で `data-tab-id` を鍵にしたのと同じ考え方（`007-sidepanel-keyboard` R-003）。
- 検索絞り込み中は並び替えを行わないため（spec FR-009）、`getVisibleItemIds()` が返す配列は
  常にそのグループの全項目になる。既存の `reorderGroup` の検証（グループ内の項目と完全一致すること）を
  満たす。

**Alternatives considered**:

- **`ItemRepository.list()` から並び順を組み立てる**: DOMの表示順と保存順が一致している前提を
  二重に持つことになる。既存の2経路が `getVisibleItemIds()` を使っているので揃える。

---

## R-005: 撤去の範囲

**Decision**: 以下を撤去する。

| 対象 | 場所 |
|------|------|
| `.reorder-controls` の `<div>` と `▲▼` の `<button>` 2つの生成 | `sidepanel.js` の `createItemCard` |
| `moveItem(item, offset)` 関数 | `sidepanel.js` |
| `.reorder-controls` / `.reorder-button` / `.reorder-button:hover` のスタイル | `sidepanel.css` |

`getVisibleItemIds()` と `persistReorder()` は**残す**（ドラッグ経路とキーボード経路が使う）。

**Rationale**: `moveItem` は `▲▼` のクリックハンドラからのみ呼ばれている。キーボード経路は
`moveInList` + `persistReorder` を使うため、`moveItem` の役割は残らない。

**あわせて更新するドキュメント**:

- `specs/003-sidepanel-list-enhancements/spec.md` の FR-002 / SC-001 に、本specで置き換わった旨を追記
- `specs/003-sidepanel-list-enhancements/quickstart.md` の `▲▼` の手順をキーボード操作に置き換え
- `README.md` の項目の並び替え手段の記述

---

## 未解決事項

なし。
