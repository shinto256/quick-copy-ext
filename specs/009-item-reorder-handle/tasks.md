---

description: "Task list for 項目カードの並び替えハンドル"
---

# Tasks: 項目カードの並び替えハンドル（ドラッグ起点を掴み手に限定する）

**Input**: Design documents from `/specs/009-item-reorder-handle/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[contracts/](./contracts/)

**Tests**: 本featureで追加する純粋なロジックはない。`dragReorder` の変更分はDOM操作が中心のため、
既存specと同方針でユニットテスト対象外とし、[quickstart.md](./quickstart.md) の手動検証で担保する。
**既存の166テストに回帰がないことを確認する**。

**Organization**: タスクはユーザーストーリー単位でまとめる。

**⚠️ US1 と US2 は分けてリリースできない**: US1（カード本体からのドラッグを止める）だけでは
並び替えの手段が失われ、US2（掴み手の追加）だけではカード本体からのドラッグが残って誤操作が
解消しない。**両方を1つの変更として完了させる。**

**Foundational フェーズは不要**: 新規ファイルなし。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（別ファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US2）

## Path Conventions

単一プロジェクト構成。**storage層（`src/storage/`）は本featureで一切変更しない。**

---

## Phase 1: Setup

- [X] T001 `npm test` を実行し、変更前の全テストがパスすることを確認する（ベースライン記録。`tests/unit/` 配下8ファイル・166テスト）

---

## Phase 2: User Story 1 & 2 - 掴み手からのみ並び替える (Priority: P1) 🎯

**Goal**: カード左端に掴み手を追加し、並び替えのドラッグをそこからのみ開始できる状態にする

**Independent Test**: カード本体を押してポインタを大きく動かしても並び替えが始まらず、掴み手を押してドラッグすると並び替えられることを確認する。カード本体を押して動かさずに離すと従来どおり値がコピーされることを確認する（[quickstart.md](./quickstart.md) セクション2・3）

### Implementation

- [X] T002 [US1] `src/sidepanel/dragReorder.js` に `handleSelector` オプションを追加する。`pointerdown` の時点で `event.target.closest(handleSelector)` を評価して `pending.fromHandle` に保持し、`pointermove` のたびに再評価しない。判定は `ignoreSelector` の後に行う（[contracts/drag-handle-contract.md](./contracts/drag-handle-contract.md)）
- [X] T003 [US1] `src/sidepanel/dragReorder.js` の閾値超過時の分岐に `handleSelector` を反映する。**`handleSelector` 指定済みで `fromHandle` が偽の場合は、その操作を無効化する**（ドラッグを開始せず、`pointerup` でも `onActivate` を呼ばない。spec FR-008 / FR-009）
- [X] T004 [US1] `src/sidepanel/dragReorder.js` の閾値未満で離したときの分岐に `handleSelector` を反映する。**`handleSelector` 指定済みで `fromHandle` が真の場合は `onActivate` を呼ばない**（掴み手は並び替え専用。spec FR-011）。それ以外は従来どおり `onActivate(row)` を呼ぶ（spec FR-010）
- [X] T005 [US2] `src/sidepanel/sidepanel.js` の `createItemCard` に `.item-card-handle` の `<span>`（字形は `⠿`）をカードの先頭（選択モード中のチェックボックスの後、カード本体より前）に追加する。**検索絞り込み中（`searchTerm` が空でない）または選択モード中（`selectionMode`）は描画しない**（spec FR-003）。`tabindex` を付けず `aria-hidden="true"` を付ける（spec FR-005）
- [X] T006 [US1] `src/sidepanel/sidepanel.js` の項目一覧の `attachDragReorder` に `handleSelector: ".item-card-handle"` を渡す（spec FR-006）。**グループの縦リスト（`groupPanel.js`）には渡さない**（spec FR-014）
- [X] T007 [P] [US2] `src/sidepanel/sidepanel.css` に `.item-card-handle` のスタイルを追加する。字形と配色は `.group-row-handle` と揃える（spec FR-002）。当たり判定はアイコンの周囲に `padding: var(--space-2)` 相当の余白を持たせる（spec FR-007）。`flex: none` と `cursor: grab`、ドラッグ中は `cursor: grabbing`。**カードの高さを変えないこと**（spec FR-004）
- [X] T008 `npm test` を実行し、`tests/unit/` の全テストがパスすることを確認する（回帰なし）
- [ ] T009 [quickstart.md](./quickstart.md) セクション1「掴み手の表示」の手順1〜8を実行し、FR-001 / FR-002 / FR-003 / FR-004 / FR-005 と SC-001 / SC-005 / SC-006 を確認する
- [ ] T010 [quickstart.md](./quickstart.md) セクション2「掴み手からの並び替え」の手順1〜8を実行し、FR-006 / FR-007 / FR-011 / FR-012 と SC-003 を確認する
- [ ] T011 [quickstart.md](./quickstart.md) セクション3「カード本体からは並び替わらない」の手順1〜7を実行し、FR-008 / FR-009 / FR-010 と SC-002 / SC-004 を確認する。**手順4（コピーを5回繰り返して順序が変わらない）が本specの目的そのもの**

**Checkpoint**: 並び替えの起点が掴み手に限定され、コピー操作で誤って並び替わらない

---

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T012 [P] `specs/006-group-navigation/contracts/drag-reorder-contract.md` の Options に `handleSelector` を追記する。`dragReorder` の契約はこのファイルが正なので、追加したオプションを反映する
- [X] T013 [P] `README.md` の項目の並び替えに関する記述に、ポインタでの並び替えはカード左端の掴み手から行うことを追記する。あわせて `specs/009-item-reorder-handle/spec.md` と `quickstart.md` への参照を「詳細な仕様」「動作確認の手順」の各リストに追加する
- [ ] T014 [quickstart.md](./quickstart.md) セクション4「回帰確認」の手順1〜11を実行し、キーボードによる並び替え（FR-013 / SC-007）とグループの縦リストの挙動（FR-014 / SC-008）に回帰がないことを確認する。**特に手順5: グループの行は本体からドラッグできるのが正しい挙動**
- [X] T015 `npx reqord impact analyze req-000013` を実行し、影響範囲があれば Reqord の該当要件・仕様の更新PRを提案する（`CLAUDE.md` の開発フロー4）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし
- **Phase 2**: Setup 完了後。**US1 と US2 を1つの変更として完了させる**
- **Polish (Phase 3)**: Phase 2 の完了後

### 同一ファイルを触るため並列にできないタスク

| ファイル | 該当タスク（実行順） |
|---------|-----------|
| `src/sidepanel/dragReorder.js` | T002（オプション追加）→ T003（閾値超過時）→ T004（閾値未満時） |
| `src/sidepanel/sidepanel.js` | T005（掴み手の追加）→ T006（`handleSelector` を渡す） |
| `src/sidepanel/sidepanel.css` | T007 のみ |

### Parallel Opportunities

- T007（CSS）は T002〜T006（JS）と並行して進められる
- T012 / T013（別ファイルのドキュメント）は並行して進められる

---

## Implementation Strategy

本featureは US1 と US2 を分けてリリースできないため、Phase 2 を1まとまりとして完了させる。

1. Phase 1: Setup（T001）
2. Phase 2: `dragReorder` のオプション追加 → 掴み手の追加 → 配線 → CSS（T002〜T008）
3. **停止して検証**: quickstart セクション1〜3 を実行する。**セクション3の手順4（コピーを
   5回繰り返して順序が変わらない）が受け入れの中心**
4. Phase 3: 契約ドキュメントとREADMEの更新、回帰確認、`reqord impact analyze`

### 実装中に仕様との差異が出た場合

`.specify/memory/constitution.md` の Reqord運用ルールに従い、**実装を即座に停止**し、
`feedback` ラベル付きの GitHub Issue を作成して Reqord への反映を提案する。
`/speckit.taskstoissues` は使用しない。

---

## Notes

- `[P]` は別ファイル・依存なしで並列実行できるタスク
- **storage層（`src/storage/`）は本featureで一切変更しない**
- `handleSelector` は**後方互換の追加**。指定しなければ従来どおり行全体がドラッグ可能になるため、
  グループの縦リストの挙動は変わらない（spec FR-014）
- **カードとグループで起点の扱いが異なるのは意図的な差**。カードは本体を押すとコピー（頻度が高い）、
  グループの行は本体を押すと切替（頻度が低く代償も小さい）。spec の Assumptions に根拠を記載済み
- **掴み手の追加でカードの高さを変えないこと**が機能上の前提。`dragReorder` は行の高さを計測して
  挿入位置を求めるため、高さが変わると挿入位置の提示が狂う（spec FR-004 / SC-006）
