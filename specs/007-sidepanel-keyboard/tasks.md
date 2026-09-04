---

description: "Task list for サイドパネルのキーボード操作対応"
---

# Tasks: サイドパネルのキーボード操作対応（縦リストのフォーカス・キーボード並び替え・オーバーレイのフォーカス管理）

**Input**: Design documents from `/specs/007-sidepanel-keyboard/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[contracts/](./contracts/)

**Tests**: 含める。`technical.yaml` の決定「Unit testを導入する(vitest + chrome API mock)」に従い、
純関数（`src/sidepanel/listReorder.js`）はユニットテスト対象とする。`focusTrap.js` および
`groupPanel.js` / `sidepanel.js` の変更分はDOM操作が中心のため、既存specと同方針でユニットテスト
対象外とし、[quickstart.md](./quickstart.md) の手動検証で担保する。

**Organization**: タスクはユーザーストーリー単位でまとめ、各ストーリーが独立して実装・検証できるようにする。

**Foundational フェーズは不要**: 本featureで追加する2モジュールは、`listReorder.js` が US2 のみ、
`focusTrap.js` が US3 のみで使われる。全ストーリーをブロックする共通の前提がないため、Setup の後は
各ストーリーへ直接進める。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（別ファイル・未完了タスクへの依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US3）
- 説明には対象ファイルのパスを含める

## Path Conventions

単一プロジェクト構成。リポジトリルート直下の `src/` と `tests/` を使う。ビルドは行わない。
**storage層（`src/storage/`）は本featureで一切変更しない。**

---

## Phase 1: Setup

- [X] T001 `npm test` を実行し、変更前の全テストがパスすることを確認する（ベースライン記録。`tests/unit/` 配下7ファイル）

---

## Phase 2: User Story 1 - キーボードで全グループパネルからグループを切り替える (Priority: P1) 🎯 MVP

**Goal**: 縦リストの各行をキーボードでフォーカスでき、決定キーでグループを切り替えられる状態にする

**Independent Test**: マウスを使わずにタブバー末尾のボタンから全グループパネルを開き、キーボードだけで縦リストの任意の行にフォーカスを移し、決定キーでそのグループへ切り替えられることを確認する（[quickstart.md](./quickstart.md) セクション1）

### Implementation for User Story 1

- [X] T002 [US1] `src/sidepanel/groupPanel.js` の `createRow(tabId)` が生成する行に `tabindex = 0` を設定する（`role` は付けない。[contracts/group-panel-keyboard-contract.md](./contracts/group-panel-keyboard-contract.md) の「行の属性」）。`createInputRow` が生成するインライン編集行には `tabindex` を付けない（内部の入力欄が独自にフォーカスを受けるため）
- [X] T003 [P] [US1] `src/sidepanel/sidepanel.css` に `.group-row:focus-visible { position: relative; z-index: 1; }` を追加する。フォーカスリングは `box-shadow` で要素の外側へ広がるため、後続の行の背景に隠れないようにする。**フォーカス表現自体は既存のグローバルな `:focus-visible` をそのまま使い、行専用の表現は追加しない**（spec FR-002 / SC-007）
- [X] T004 [US1] `src/sidepanel/groupPanel.js` に `#group-panel-list` への `keydown` の委譲を追加し、`Enter` と `Space` で既存の `activateTab(row.dataset.tabId)` を呼ぶ。**`event.target` が行自身でない場合（三点リーダー・入力欄など行の内側）は何もしない**（spec FR-004 / FR-014）。`Space` は `preventDefault()` でページスクロールを抑止する（spec FR-003）
- [ ] T005 [US1] [quickstart.md](./quickstart.md) セクション1「キーボードでグループを切り替える」の手順1〜8を実行し、FR-001 / FR-002 / FR-003 / FR-004 / FR-005 / FR-006 と SC-001 / SC-003 / SC-007 を確認する

**Checkpoint**: キーボードだけでパネルからグループを切り替えられる。spec 004 FR-016 の未達分が解消している

---

## Phase 3: User Story 2 - キーボードでグループの並び順を変える (Priority: P2)

**Goal**: フォーカスした行を `Alt` + 矢印で1つずつ上下に移動でき、順序が永続化されタブ順に反映される状態にする

**Independent Test**: キーボードだけで縦リストの最下部の行にフォーカスを移し、上へ移動するキー操作を繰り返して先頭まで移動させ、タブバーの表示順が追従し、拡張機能を開き直しても順序が保持されることを確認する（[quickstart.md](./quickstart.md) セクション2）

### Tests for User Story 2

- [X] T006 [US2] `tests/unit/listReorder.test.js` を新規作成し、`moveInList` のテスト観点11件（[contracts/list-reorder-contract.md](./contracts/list-reorder-contract.md)）を書く。実装前なので失敗することを確認する

### Implementation for User Story 2

- [X] T007 [US2] `src/sidepanel/listReorder.js` を新規作成し、`moveInList(list, index, offset)` を実装して T006 をパスさせる（移動先が範囲外、または `index` が範囲外なら順序を変えずに新しい配列を返す。引数は変更しない）
- [X] T008 [US2] `src/sidepanel/groupPanel.js` の `handleReorder` を「並び順配列を受け取って保存・再描画・エラー処理を行う」共通の処理に整理する。ドラッグ経路（`onReorder`）とキーボード経路の双方から使えるようにし、**再描画後にフォーカスを戻すかどうかを引数で分ける**
- [X] T009 [US2] `src/sidepanel/groupPanel.js` の `keydown`（T004 で追加した委譲）に `Alt` + `↑` / `Alt` + `↓` を追加する。`canReorder()` が `false` の間は並び替えを行わない（spec FR-012 / FR-013）。対象行の `data-tab-id` から現在の並び順内の位置を求め、`moveInList` で新しい並び順を作る（`data-tab-id` は未分類のセンチネルも含むため、**未分類の行も移動の対象になる**。spec FR-010）。**結果が元と同じ（境界に達していた）場合は保存もエラー表示も行わない**（spec FR-011）。`preventDefault()` でブラウザの既定動作を抑止する
- [X] T010 [US2] `src/sidepanel/groupPanel.js` に、再描画後に `data-tab-id` が一致する行を探して `focus()` する処理を追加する（spec FR-009。[research.md](./research.md) R-003）。永続化に失敗して保存済みの順序から再描画した場合も、同じ手順で操作していた行へフォーカスを戻す（spec FR-016）
- [X] T011 [US2] `npm test` を実行し、`tests/unit/listReorder.test.js` の追加分（T006）と `tests/unit/` の既存テストがすべてパスすることを確認する
- [ ] T012 [US2] [quickstart.md](./quickstart.md) セクション2「キーボードでグループを並び替える」の手順1〜14を実行し、FR-007 / FR-008 / FR-009 / FR-010 / FR-011 / FR-012 / FR-013 / FR-014 / FR-015 / FR-016 と SC-002 / SC-004 を確認する

**Checkpoint**: キーボードだけで任意のグループを並び順の先頭へ移動できる

---

## Phase 4: User Story 3 - オーバーレイ表示中にフォーカスが迷子にならない (Priority: P3)

**Goal**: 全グループパネルと項目登録フォームの表示中にフォーカスがオーバーレイ内を循環し、閉じたときに開く前の要素へ戻る状態にする

**Independent Test**: キーボードだけで全グループパネルと項目登録フォームをそれぞれ開き、フォーカスを繰り返し先へ進めてもオーバーレイの外へ出ないこと、取消キーで閉じたときにフォーカスが開く操作を行った要素へ戻ることを確認する（[quickstart.md](./quickstart.md) セクション3）

### Implementation for User Story 3

- [X] T013 [US3] `src/sidepanel/focusTrap.js` を新規作成し、`createFocusTrap(overlayEl, options)` が `{ activate, deactivate, isActive }` を返す形で実装する（`document` の `keydown` を capture フェーズで受け、`Tab` / `Shift` + `Tab` が端を越えるときに反対側へ移す。フォーカス可能な要素はキー入力のたびに求める。詳細は [contracts/focus-trap-contract.md](./contracts/focus-trap-contract.md)）
- [X] T014 [US3] `src/sidepanel/groupPanel.js` で `createFocusTrap(overlayEl, { fallbackFocus: () => document.querySelector(".tab-panel-open") })` を作り、`open()` で `activate(document.activeElement)`、`close()` で `deactivate()` を呼ぶ。**`fallbackFocus` はセレクタ（`.tab-panel-open`。このボタンに `id` はない）で都度取得する関数にする**（ボタンは `renderTabs()` のたびに作り直されるため、要素の参照を保持すると古い要素を指す）
- [X] T015 [US3] `src/sidepanel/sidepanel.js` で `createFocusTrap(formOverlay, { fallbackFocus: () => addItemButton })` を作り、`openItemForm()` の末尾で `activate(document.activeElement)`、`closeItemForm()` で `deactivate()` を呼ぶ。既存の `nameField.focus()` はそのまま維持する
- [X] T016 [US3] `src/sidepanel/sidepanel.js` の `document` の `keydown` に `Escape` の処理を追加し、`isFormOpen === true` の間は `closeItemForm()` を呼ぶ（spec FR-020）。既存の `closeItemForm()` は `form.reset()` を行うため入力内容は保存されない
- [ ] T017 [US3] [quickstart.md](./quickstart.md) セクション3「オーバーレイのフォーカス管理」の手順1〜14を実行し、FR-017 / FR-018 / FR-019 / FR-020 / FR-021 と SC-005 / SC-006 を確認する。**FR-021（インライン編集中の `Escape` は編集取消を優先）は既存実装（入力欄の `keydown` が `stopPropagation()` する）で満たされるため、実装変更は不要。維持されていることの確認のみ行う**

**Checkpoint**: 3つのユーザーストーリーがすべて独立して動作する

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T018 [P] `README.md` の「機能」節に、全グループパネルのキーボード操作（行のフォーカスと決定キーでの切替、`Alt` + 矢印による並び替え）を追記する。あわせて `specs/007-sidepanel-keyboard/spec.md` と `quickstart.md` への参照を「詳細な仕様」「動作確認の手順」の各リストに追加する
- [ ] T019 [quickstart.md](./quickstart.md) セクション4「既存機能の回帰確認」の手順1〜9を**マウスを使って**実行し、ポインタ操作（タップでの切替、ドラッグでの並び替え、5px閾値の判定、三点リーダー、項目カードのドラッグとコピー、`▲▼`）に回帰がないことを確認する（spec SC-008）
- [X] T020 [quickstart.md](./quickstart.md) セクション5「自動テストの実行」に従い `npm test` を実行し、`tests/unit/` の全テスト（新規 `listReorder.test.js` を含む）がパスすることを確認する
- [X] T021 `npx reqord impact analyze req-000011` を実行し、影響範囲があれば Reqord の該当要件・仕様の更新PRを提案する（`CLAUDE.md` の開発フロー4）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし
- **User Stories (Phase 2〜4)**: Setup 完了後。フェーズは上から順に実行できる
- **Polish (Phase 5)**: 実装対象のユーザーストーリーがすべて完了後

Foundational フェーズはない（全ストーリーをブロックする共通の前提がないため）。

### User Story Dependencies

- **US1 (P1 / Phase 2)**: 他ストーリーへの依存なし
- **US2 (P2 / Phase 3)**: T009 は US1 の T004 で追加した `keydown` の委譲にキーを足すため、**US1 の後に実装する**
- **US3 (P3 / Phase 4)**: 実装は他ストーリーへの依存なしで進められる（`focusTrap.js` は新規ファイルで、`groupPanel.js` への変更箇所も `open` / `close` に限られる）。ただし**検証は US1 の後**に行う必要がある。US3 のシナリオ1「フォーカスがパネル内の要素（各行を含む）を循環する」は、行がフォーカス可能であること（US1 の T002）を前提にするため

### Within Each User Story

- テストタスク（T006）は実装前に書き、失敗することを確認する
- 純関数（`listReorder.js`）→ UI層（`groupPanel.js`）の順
- CSSタスクは対応するDOM変更タスクと並行して進められる
- 各ストーリーの最後に quickstart の該当セクションを実行してから次へ進む

### 同一ファイルを触るため並列にできないタスク

| ファイル | 該当タスク（実行順） |
|---------|-----------|
| `src/sidepanel/groupPanel.js` | T002（`tabindex`）→ T004（`keydown` 委譲）→ T008（`handleReorder` 整理）→ T009（`Alt` + 矢印）→ T010（フォーカス復帰）→ T014（focusTrap 適用） |
| `src/sidepanel/sidepanel.js` | T015（focusTrap 適用）→ T016（`Escape`） |
| `src/sidepanel/sidepanel.css` | T003 のみ |

### Parallel Opportunities

- **Phase 2**: T003（CSS）は T002 / T004（JS）と並行して進められる
- **Phase 3**: T006（テスト）と T007（純関数）は `groupPanel.js` に触らないため、T008〜T010 の準備と独立して進められる
- **Phase 4**: T013（`focusTrap.js` の新規作成）は他のどのタスクとも独立している
- **Phase 5**: T018（README）は T019 / T020 と並行して進められる
- ストーリー間の並列: US3 は US1 / US2 と独立しているため、別の担当者が同時に進められる（ただし
  `groupPanel.js` を両方が触るため、T014 は T002 でファイルに手が入った後にする）

---

## Parallel Example: User Story 2

```text
# T006 でテストを書いたあと、以下を並行して進められる:
Task: "src/sidepanel/listReorder.js に moveInList を実装する（T007）"
Task: "src/sidepanel/groupPanel.js の handleReorder を共通処理に整理する（T008）"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1: Setup（T001）
2. Phase 2: User Story 1（T002〜T005）
3. **停止して検証**: quickstart セクション1 を**マウスに触らずに**実行し、キーボードだけで
   グループを切り替えられることを確認する
4. この時点で spec 004 FR-016（すべてのインタラクティブ要素にフォーカス表示）の未達分が解消するため、
   単独でリリース可能

### Incremental Delivery

1. Setup → ベースライン確定
2. US1 追加（Phase 2）→ キーボードで行をフォーカスして切替（**MVP**）
3. US2 追加（Phase 3）→ `Alt` + 矢印による並び替え
4. US3 追加（Phase 4）→ オーバーレイのフォーカストラップと復帰
5. Phase 5 → README の追記、ポインタ操作の回帰確認、`reqord impact analyze`

各段階で既存機能を壊さない。US1 だけでもキーボード利用者の主要な行き止まりは解消する。

### 実装中に仕様との差異が出た場合

`.specify/memory/constitution.md` の Reqord運用ルールに従い、**実装を即座に停止**し、
`feedback` ラベル付きの GitHub Issue を作成して Reqord への反映を提案する。
`/speckit.taskstoissues` は使用しない（Issue化は `reqord task create` / `reqord task sync` で行う）。

---

## Notes

- `[P]` は別ファイル・依存なしで並列実行できるタスク
- `[Story]` ラベルはトレーサビリティのためユーザーストーリーに対応させている
- テストタスクは実装前に書き、失敗を確認してから実装に進む
- タスク単位、または論理的なまとまりごとにコミットする
- **storage層（`src/storage/`）は本featureで一切変更しない。** 並び順の永続化は既存の
  `groupRepository.reorderTabs()` をそのまま使う
- **ポインタ操作に回帰を出さないことが本featureの制約**（spec FR-006 / SC-008）。行を
  フォーカス可能にする変更が `dragReorder` の判定（`pointerdown` の `preventDefault()`、5px閾値）に
  影響しないことを T019 で必ず確認する
- `dragReorder` は行の `pointerdown` で `preventDefault()` するため、**行をポインタで押しても
  フォーカスは移らない**。ポインタで押した場合はグループが切り替わるため実害はなく、spec の
  Assumptions に記載済み。この挙動は変更しない
