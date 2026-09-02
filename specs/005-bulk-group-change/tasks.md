---

description: "Task list template for feature implementation"
---

# Tasks: 選択項目グループ一括変更・選択モード中の個別操作制限

**Input**: Design documents from `/specs/005-bulk-group-change/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `itemRepository`への追加関数はcontracts/でユニットテスト対象と定義済みのため含める。
DOM組み立て自体(`sidepanel.js`)は既存spec(001〜003)の方針を踏襲しユニットテスト対象外
(quickstart.mdの手動検証で担保)。

**Organization**: タスクはspec.mdのUser Story（優先度順: P1→P2）ごとにグループ化。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（別ファイル・依存なし）
- **[Story]**: 対応するUser Story（US1〜US2、spec.mdの番号に対応）
- 各タスクに具体的なファイルパスを明記

## Path Conventions

単一プロジェクト構成。UIは`src/sidepanel/`、データ層は`src/storage/`（いずれも既存ファイルへの
追加のみ、新規ディレクトリ作成なし）、テストは`tests/unit/`。

---

## Phase 1: Setup

本featureは新規ファイル・新規ディレクトリの作成を伴わない（既存の`src/sidepanel/`・
`src/storage/`配下のファイルに関数・ロジックを追加するのみ）。Setupフェーズの作業はなし。
Phase 2から着手する。

---

## Phase 2: Foundational（複数User Story共通の前提）

US1（個別カード操作の無効化）とUS2（グループ一括変更）は、既存の選択モード基盤
(`selectionMode`/`selectedItemIds`、選択ツールバー`#selection-toolbar`)をそれぞれ独立した
箇所(カード描画処理 / 選択ツールバー内の新規ボタン)で拡張するため、共有の前提作業は発生しない。
Foundationalフェーズの作業はなし。Phase 3から着手する。

---

## Phase 3: User Story 1 - 選択モード中は個別カード操作を誤って行わない (Priority: P1) 🎯 MVP

**Goal**: 選択モードが有効な間、各カードのコピーボタン・三点リーダーボタンを操作不可にし、
選択モード開始時に開いていた個別メニューは自動的に閉じる

**Independent Test**: 選択モードを開始した状態で、任意のカードのコピーボタン・三点リーダー
ボタンを押しても副作用(コピー実行・個別メニュー表示)が発生しないこと、選択モード開始前に
開いていた個別メニューが自動的に閉じることを確認する

### Implementation for User Story 1

- [X] T001 [US1] `src/sidepanel/sidepanel.js` の `createItemCard(item, maskEnabled)` を更新し、
      `selectionMode`が`true`の間は`copyButton`・`kebabButton`に`disabled = true`を設定する
      （FR-001, FR-002。contracts/sidepanel-ui-additions-contract.md準拠。チェックボックスの
      有効/無効は変更しない）
- [X] T002 [US1] `src/sidepanel/sidepanel.js` の `startSelectionMode()` を更新し、`openItemMenuId`
      を`null`にリセットしてから`renderList()`を呼ぶようにする（FR-002a準拠。Clarifications
      2026-09-02、research.md 3参照）
- [X] T003 [P] [US1] `src/sidepanel/sidepanel.css` に、選択モード中`disabled`状態のコピーボタン・
      三点リーダーボタンの見た目(グレーアウト表示)を追加する

**Checkpoint**: User Story 1が単独で動作・検証可能(選択モード中のコピー・個別メニュー無効化、
開始時の既存メニュー自動クローズ)

---

## Phase 4: User Story 2 - 選択した複数項目のグループをまとめて変更する (Priority: P2)

**Goal**: 選択ツールバーから「グループ変更」操作を行い、変更先グループを選んで確定すると、
選択中の全項目のグループが一括更新される

**Independent Test**: 異なるグループに属する項目を選択モードで複数選択し、「グループ変更」から
変更先を選んで適用すると、選択したすべての項目のグループが更新され、未選択項目は変更されない
ことを確認する。選択件数0件では操作が無効化されること、キャンセル時は変更が発生しないことも
確認する

### Implementation for User Story 2

- [X] T004 [P] [US2] `src/storage/itemRepository.js` に `updateGroupMany(ids, groupId)` を実装する
      （contracts/item-repository-additions.md準拠。存在しないIDは無視、1回の書き込みで永続化、
      対象項目は変更先グループの末尾に配置）
- [X] T005 [P] [US2] `tests/unit/itemRepository.test.js` に `updateGroupMany` のテストを追加する
      （異なるグループ混在からの一括変更、未選択項目の非変更、存在しないID混在、空配列、
      `null`(未分類)指定）
- [X] T006 [P] [US2] `src/sidepanel/sidepanel.html` の選択ツールバー(`#selection-toolbar`)に
      「グループ変更」ボタンと、変更先グループの`<select>`＋「適用」「キャンセル」ボタンを持つ
      ポップオーバーの骨格(初期状態は非表示)を追加する
- [X] T007 [P] [US2] `src/sidepanel/sidepanel.css` にグループ変更ポップオーバーの表示スタイルを
      追加する
- [X] T008 [US2] `src/sidepanel/sidepanel.js` の `updateSelectionToolbar()` を更新し、選択件数が
      0件の場合は「グループ変更」ボタンを`disabled`にする（既存の削除ボタンと同じ扱い）
- [X] T009 [US2] `src/sidepanel/sidepanel.js` に状態変数`groupChangePopoverOpen`(boolean)を追加し、
      「グループ変更」ボタン押下時に`true`にする処理を実装する: 既存の`populateGroupSelect`相当の
      ロジックを再利用してポップオーバー内の`<select>`に未分類を含むグループ一覧を描画し、
      ポップオーバーを表示する（依存: T004, T006。data-model.md「本UIで新たに扱う画面内一時状態」参照）
- [X] T010 [US2] `src/sidepanel/sidepanel.js` に「適用」実行時の処理を実装する:
      `selectedItemIds`と選択された変更先グループIDを`ItemRepository.updateGroupMany()`に渡し、
      完了後`renderTabs()`・`renderList()`を再実行し、選択モードを終了して`groupChangePopoverOpen`を
      `false`に戻す（依存: T004, T009）
- [X] T011 [US2] `src/sidepanel/sidepanel.js` に「キャンセル」実行時の処理を実装する:
      `ItemRepository`を呼び出さず`groupChangePopoverOpen`を`false`に戻し、選択状態・選択モードは
      維持する（依存: T009）
- [X] T012 [US2] 既存のタブ切替ハンドラ・検索入力ハンドラを更新し、選択モードがリセットされる
      際に`groupChangePopoverOpen`が`true`であれば同時に`false`へ戻すようにする（依存: T009）

**Checkpoint**: User Story 1・2が単独・組み合わせともに動作可能

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 全体の回帰確認とドキュメント更新

- [X] T013 `npm run test` を実行し、既存テスト+新規テスト(`updateGroupMany`)がすべてパスすることを
      確認する
- [ ] T014 `quickstart.md` の手順(1〜2)に沿って手動検証を行い、全項目を確認する(この開発環境には
      Chrome/Edge実行環境がなく自動化もできないため未実施。ユーザーによる手動確認が必要)
- [X] T015 [P] `README.md` に選択モード中の個別操作制限・グループ一括変更機能の概要を追記し、
      仕様書リンクに `specs/005-bulk-group-change/spec.md` を追加する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 作業なし
- **Foundational (Phase 2)**: 作業なし
- **User Stories (Phase 3〜4)**: US1・US2とも既存の選択モード基盤にのみ依存し、Foundational完了
  待ちは発生しない。互いに独立して着手・実装可能
- **Polish (Phase 5)**: 実施対象のUser Story完了後

### User Story Dependencies

- **US1 (P1)**: 依存なし。既存のカード描画処理(`createItemCard`)・選択モード状態
  (`selectionMode`)を利用するのみ
- **US2 (P2)**: 依存なし。US1と同じ選択モード状態を参照するが、変更対象(カードの個別ボタン vs
  選択ツールバー)が異なるため、US1の実装完了を待たずに並行着手可能

### Within Each User Story

- Repository層の関数実装・テストが先、UIロジックが後
- Story内の実装完了後、Checkpointで独立動作を確認してから次のStoryへ

### Parallel Opportunities

- US1: T003(CSS)はT001・T002と並行可能
- US2: T004(Repository実装)・T005(テスト)・T006(HTML骨格)・T007(CSS)は互いに並行可能
- US1とUS2は担当者が異なる場合、全体を並行して着手可能
- Polish内 T015(README更新)は他タスクと並行可能

---

## Parallel Example: User Story 1 + User Story 2

```bash
# User Story 1
Task: "src/sidepanel/sidepanel.js の createItemCard に選択モード中のdisabled制御を追加する"
Task: "src/sidepanel/sidepanel.css に選択モード中のボタンのグレーアウトスタイルを追加する"

# User Story 2(US1と並行可能)
Task: "src/storage/itemRepository.js に updateGroupMany を実装する"
Task: "tests/unit/itemRepository.test.js に updateGroupMany のテストを追加する"
Task: "src/sidepanel/sidepanel.html にグループ変更ポップオーバーの骨格を追加する"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 3: User Story 1 完了
2. **STOP and VALIDATE**: 選択モード中のコピー・個別メニュー無効化、既存メニューの自動クローズを
   単独検証
3. 必要ならここでデモ・レビュー

### Incremental Delivery

1. US1追加 → 個別操作の誤操作防止を検証(MVP)
2. US2追加 → グループ一括変更を検証
3. Polish → 全体回帰テスト・ドキュメント更新

## Notes

- [P]タスク = 異なるファイル・依存なし
- [Story]ラベルはUser Storyへのトレーサビリティ用(spec.mdの番号=US1/US2に対応)
- 各Storyは独立して完結・検証可能
- Story完了ごとにcheckpointで独立動作を確認してから次へ進む
