---

description: "Task list for 項目並び替え操作の統一"
---

# Tasks: 項目並び替え操作の統一（カードのキーボード操作と上下移動ボタンの撤去）

**Input**: Design documents from `/specs/008-item-reorder-unification/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[contracts/](./contracts/)

**Tests**: 含める。キーの判定（`reorderOffsetFromKey` / `isActivationKey`）は純関数として
`listReorder.js` に追加し、ユニットテスト対象とする。カードのキーイベント処理とフォーカス復帰は
DOM操作が中心のため、既存specと同方針でユニットテスト対象外とし、[quickstart.md](./quickstart.md) の
手動検証で担保する。

**Organization**: タスクはユーザーストーリー単位でまとめる。

**⚠️ ストーリーの順序が固定**: US2（上下移動ボタンの撤去）は US1（キーボード操作の追加）の**後に
実施しなければならない**。順序を逆にすると、一時的にキーボードで項目を並び替えられない状態が生まれ、
req-000008 FR-018（キーボード到達性）を破る。

**Foundational フェーズは不要**: 新規ファイルはなく、`moveInList` / `focusTrap` はいずれも既存。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（別ファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US2）

## Path Conventions

単一プロジェクト構成。**storage層（`src/storage/`）は本featureで一切変更しない。**

---

## Phase 1: Setup

- [ ] T001 `npm test` を実行し、変更前の全テストがパスすることを確認する（ベースライン記録。`tests/unit/` 配下8ファイル）

---

## Phase 2: User Story 1 - キーボードで項目を並び替え、コピーする (Priority: P1) 🎯 MVP

**Goal**: 項目カードをキーボードでフォーカスでき、`Enter`/`Space` でコピー、`Alt`+矢印で並び替えられる状態にする

**Independent Test**: マウスを使わずに項目カードにフォーカスを移し、グループの縦リストと同じキー操作で任意の項目を一覧の先頭まで移動でき、決定キーで値をコピーできることを確認する（[quickstart.md](./quickstart.md) セクション1）

### Tests for User Story 1

- [ ] T002 [US1] `tests/unit/listReorder.test.js` に `reorderOffsetFromKey` の4観点と `isActivationKey` の3観点（[contracts/reorder-keys-contract.md](./contracts/reorder-keys-contract.md)）を追加する。実装前なので失敗することを確認する

### Implementation for User Story 1

- [ ] T003 [US1] `src/sidepanel/listReorder.js` に `reorderOffsetFromKey(event)` と `isActivationKey(event)` を追加して T002 をパスさせる（`altKey` と `key` の2プロパティのみを読む純関数。既存の `moveInList` は変更しない）
- [ ] T004 [US1] `src/sidepanel/groupPanel.js` の `handleRowKeydown` にある直書きのキー判定（`event.key === "Enter" || event.key === " "` と `event.altKey && ...`）を T003 の2関数の呼び出しに置き換える。**キーの同一性をコード上で保証するため**（spec FR-005 / SC-005）。挙動は変えない
- [ ] T005 [US1] `src/sidepanel/sidepanel.js` の `createItemCard` が生成する `.item-card` に `tabIndex = 0` を設定する（`role` は付けない。[research.md](./research.md) R-002）
- [ ] T006 [P] [US1] `src/sidepanel/sidepanel.css` に `.item-card:focus-visible { position: relative; z-index: 1; }` を追加する。フォーカスリングが隣のカードに隠れないようにする。**フォーカス表現自体は既存のグローバルな `:focus-visible` をそのまま使い、カード専用の表現は追加しない**（spec FR-002 / SC-007）
- [ ] T007 [US1] `src/sidepanel/sidepanel.js` に `#item-list` への `keydown` の委譲を追加する。`event.target` が `.item-card` 自身でない場合（コピーボタン・三点リーダー・チェックボックス）は何もしない（spec FR-010）。`isActivationKey` が真なら `preventDefault()` して値をコピーする（`Space` のページスクロールを抑止。spec FR-003）。`reorderOffsetFromKey` が `-1`/`1` を返したら `preventDefault()` して並び替える
- [ ] T008 [US1] `src/sidepanel/sidepanel.js` のカードの `keydown` に無効化条件を入れる。**検索絞り込み中（`searchTerm` が空でない）または選択モード中（`selectionMode`）は、並び替えもコピーも行わない**（spec FR-009）。既存のドラッグ経路の `canDrag` と同じ条件
- [ ] T009 [US1] `src/sidepanel/sidepanel.js` に並び替えの処理を実装する。既存の `getVisibleItemIds()` で並び順を取り、`moveInList` で新しい順序を作る。**結果が元と同じ（境界に達していた）場合は何もしない**（spec FR-008）。既存の `persistReorder(orderedIds)` で永続化する（[research.md](./research.md) R-004）
- [ ] T010 [US1] `src/sidepanel/sidepanel.js` に、再描画後に `data-item-id` が一致するカードを探して `focus()` する処理を追加する（spec FR-007。`persistReorder` は内部で `renderList()` を呼びカードを作り直すため、移動前の要素へは戻せない）
- [ ] T011 [US1] `npm test` を実行し、`tests/unit/listReorder.test.js` の追加分（T002）と `tests/unit/` の既存テストがすべてパスすることを確認する
- [ ] T012 [US1] [quickstart.md](./quickstart.md) セクション1「キーボードで項目を並び替え、コピーする」の手順1〜15を**マウスに触らずに**実行し、FR-001 / FR-002 / FR-003 / FR-004 / FR-005 / FR-006 / FR-007 / FR-008 / FR-009 / FR-010 と SC-003 / SC-004 / SC-005 / SC-006 / SC-007 を確認する

**Checkpoint**: キーボードだけで項目を並び替え・コピーできる。**この時点で `▲▼` を撤去できる状態になる**

---

## Phase 3: User Story 2 - カードの表示領域を名前と値に充てる (Priority: P2)

**Goal**: 各カードから上下移動ボタンを撤去し、空いた領域を名前と値の表示に充てる

**Independent Test**: 項目一覧のカードに上下移動ボタンが表示されていないこと、その分だけ名前と値の表示幅が広がっていること、並び替えがドラッグ操作とキーボード操作の両方で行えることを確認する（[quickstart.md](./quickstart.md) セクション2）

**⚠️ US1 の完了が前提**: キーボードによる並び替え（US1）がない状態で `▲▼` を撤去すると、キーボードで項目を並び替える手段が失われる。

### Implementation for User Story 2

- [ ] T013 [US2] `src/sidepanel/sidepanel.js` の `createItemCard` から `.reorder-controls` の `<div>` と `▲▼` の `<button>` 2つの生成コードを削除する（spec FR-011 / FR-012）
- [ ] T014 [US2] `src/sidepanel/sidepanel.js` から `moveItem(item, offset)` 関数を削除する（`▲▼` のクリックハンドラからのみ呼ばれていた。[research.md](./research.md) R-005）。`getVisibleItemIds()` と `persistReorder()` は**残す**（ドラッグ経路とキーボード経路が使う）
- [ ] T015 [P] [US2] `src/sidepanel/sidepanel.css` から `.reorder-controls` / `.reorder-button` / `.reorder-button:hover` のスタイルを削除する
- [ ] T016 [US2] [quickstart.md](./quickstart.md) セクション2「上下移動ボタンの撤去」の手順1〜5を実行し、FR-011 / FR-012 / FR-013 と SC-001 を確認する

**Checkpoint**: 並び替えの手段がドラッグ操作とキーボード操作の2つに統一されている

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T017 [P] `specs/003-sidepanel-list-enhancements/spec.md` の FR-002 と SC-001 に、本spec（`008-item-reorder-unification`）で置き換わった旨を追記する。**要件を削除せず、置き換わったことが追跡できる形で残す**
- [ ] T018 [P] `specs/003-sidepanel-list-enhancements/quickstart.md` のセクション1から `▲▼` を使う手順を削除し、`Alt` + 矢印によるキーボード操作の手順に置き換える
- [ ] T019 [P] `README.md` の「機能」節の項目の並び替えに関する記述を、ドラッグ操作とキーボード操作の2手段に更新する。あわせて `specs/008-item-reorder-unification/spec.md` と `quickstart.md` への参照を「詳細な仕様」「動作確認の手順」の各リストに追加する
- [ ] T020 [quickstart.md](./quickstart.md) セクション3「既存のポインタ操作の回帰確認」の手順1〜8を**マウスを使って**実行し、ドラッグでの並び替え、5px閾値の判定、タップでのコピー、自動スクロールに回帰がないことを確認する（spec FR-014 / SC-008）
- [ ] T021 [quickstart.md](./quickstart.md) セクション4「既存機能の回帰確認」の手順1〜7を実行する
- [ ] T022 [quickstart.md](./quickstart.md) セクション5に従い `npm test` を実行し、`tests/unit/` の全テストがパスすることを確認する
- [ ] T023 `npx reqord impact analyze req-000012` を実行し、影響範囲があれば Reqord の該当要件・仕様の更新PRを提案する（`CLAUDE.md` の開発フロー4）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし
- **US1 (Phase 2)**: Setup 完了後
- **US2 (Phase 3)**: **US1 の完了が前提**（キーボード到達性を確保してから `▲▼` を撤去する）
- **Polish (Phase 4)**: US1・US2 の完了後

### 同一ファイルを触るため並列にできないタスク

| ファイル | 該当タスク（実行順） |
|---------|-----------|
| `src/sidepanel/sidepanel.js` | T005（`tabIndex`）→ T007（`keydown` 委譲）→ T008（無効化条件）→ T009（並び替え）→ T010（フォーカス復帰）→ T013（`▲▼` 撤去）→ T014（`moveItem` 削除） |
| `src/sidepanel/listReorder.js` | T003 のみ |
| `src/sidepanel/groupPanel.js` | T004 のみ |
| `src/sidepanel/sidepanel.css` | T006 → T015 |
| `tests/unit/listReorder.test.js` | T002 のみ |

### Parallel Opportunities

- **Phase 2**: T006（CSS）は T005 / T007〜T010（JS）と並行して進められる。T003 / T004 は
  `sidepanel.js` に触らないため独立
- **Phase 3**: T015（CSS）は T013 / T014（JS）と並行して進められる
- **Phase 4**: T017 / T018 / T019（いずれも別ファイルのドキュメント）は並行して進められる

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1: Setup（T001）
2. Phase 2: User Story 1（T002〜T012）
3. **停止して検証**: quickstart セクション1 をマウスに触らずに実行する
4. この時点で並び替えの手段が3つ（ドラッグ・`▲▼`・`Alt`+矢印）になるが、いずれも動作する。
   単独でリリースしても壊れない

### Incremental Delivery

1. Setup → ベースライン確定
2. US1 追加（Phase 2）→ カードのキーボード操作（**MVP**）
3. US2 追加（Phase 3）→ `▲▼` の撤去。ここで手段が2つに統一される
4. Phase 4 → spec 003 とREADMEの更新、ポインタ操作の回帰確認、`reqord impact analyze`

### 実装中に仕様との差異が出た場合

`.specify/memory/constitution.md` の Reqord運用ルールに従い、**実装を即座に停止**し、
`feedback` ラベル付きの GitHub Issue を作成して Reqord への反映を提案する。
`/speckit.taskstoissues` は使用しない。

---

## Notes

- `[P]` は別ファイル・依存なしで並列実行できるタスク
- テストタスク（T002）は実装前に書き、失敗を確認してから実装に進む
- **storage層（`src/storage/`）は本featureで一切変更しない**
- **US2 を US1 より先に実施してはならない**（キーボード到達性が一時的に失われる）
- T004 は挙動を変えない置き換え。キーの値が1箇所（`listReorder.js`）に集まることで、
  spec FR-005 / SC-005 の「カードとグループでキーが同一」がコード上で保証される
- `dragReorder` はカードの `pointerdown` で `preventDefault()` するため、**カードをポインタで
  押してもフォーカスは移らない**。押した場合は値がコピーされるため実害はなく、グループの縦リストと
  同じ扱い。この挙動は変更しない
