---

description: "Task list template for feature implementation"
---

# Tasks: クイックコピー登録・管理機能

**Input**: Design documents from `/specs/001-quick-copy-items/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: research.md 決定3（vitest導入）およびReqord spec-000001〜000004design.mdの
テスト方針に基づき、各User Storyにユニットテストタスクを含める。

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1〜US4)
- Include exact file paths in descriptions

## Path Conventions

Single project構成（plan.md Project Structure参照）: `manifest.json`, `src/popup/`,
`src/options/`, `src/storage/`, `tests/unit/`, `icons/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: プロジェクトの初期構造を作成する

- [X] T001 `manifest.json`, `src/popup/`, `src/options/`, `src/storage/`, `tests/unit/`, `icons/`
  のディレクトリ構成を作成する（plan.md Project Structure参照）
- [X] T002 `package.json` を作成し、vitestを開発依存として追加する（research.md 決定3）
- [X] T003 [P] `manifest.json` を作成する（Manifest V3、`action`にpopup、`options_page`、
  `permissions: ["storage"]` を設定）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全User Storyが依存する共通基盤。ここが完了するまでどのUser Storyも着手不可

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 `chrome.storage.local` のget/setをPromiseでラップする共通ヘルパーを
  `src/storage/storageClient.js` に実装する
- [X] T005 [P] 共通エラークラス（`ValidationError`, `NotFoundError`, `StorageError`）を
  `src/storage/errors.js` に実装する（contracts/の各Repository契約が参照）
- [X] T006 [P] ストア申請用アイコン（16/48/128px）を `icons/` に配置する（`manifest.json` が参照）

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 項目の登録・保存・編集・削除 (Priority: P1) 🎯 MVP

**Goal**: ユーザーが名前・値の組を項目として登録・保存し、編集・削除できる（FR-001〜FR-003,
FR-014, FR-015）

**Independent Test**: quickstart.md「US1: 項目の登録・保存・編集・削除」の手順（options画面で
保存・編集・削除を行い、一覧に反映されることを確認）

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [P] [US1] `ItemRepository.create()` の境界値テスト（name: 0/1/50/51文字、
  value: 0/1/2000/2001文字、登録上限499→500→501件）を `tests/unit/itemRepository.test.js` に書く
- [X] T008 [P] [US1] `ItemRepository.update()` / `delete()` の正常系・存在しないID時の
  `NotFoundError` テストを `tests/unit/itemRepository.test.js` に書く

### Implementation for User Story 1

- [X] T009 [US1] `contracts/item-repository.md` の `list/create/update/delete` を
  `src/storage/itemRepository.js` に実装する（依存: T004, T005）
- [X] T010 [US1] 登録フォーム（名前・値の入力欄、複数行対応のtextarea、保存ボタン、
  項目一覧・編集・削除UI）を `src/options/options.html` に実装する
- [X] T011 [US1] 保存・編集・削除ハンドラとバリデーションエラー表示を
  `src/options/options.js` に実装する（依存: T009, T010）
- [X] T012 [P] [US1] 最小限のスタイルを `src/options/options.css` に実装する

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - 一覧表示とコピー（デフォルトマスク表示） (Priority: P2)

**Goal**: 一覧を開くと値がマスク表示され、コピー操作で値の原文がクリップボードにコピーされる
（FR-004〜FR-006）

**Independent Test**: quickstart.md「US2: 一覧表示とコピー」の手順（popupでマスク表示を確認し、
コピー操作で原文が貼り付けられることを確認）

### Tests for User Story 2 ⚠️

- [X] T013 [P] [US2] `SettingsRepository.get()` の未初期化時デフォルト値
  （`{ maskEnabled: true }`）テストを `tests/unit/settingsRepository.test.js` に書く
- [X] T014 [P] [US2] マスク表示ロジック（値の文字数によらず固定マスク記号になること）の
  ユニットテストを `tests/unit/maskDisplay.test.js` に書く

### Implementation for User Story 2

- [X] T015 [US2] `contracts/settings-repository.md` の `get/setMaskEnabled` を
  `src/storage/settingsRepository.js` に実装する（依存: T004, T005）
- [X] T016 [US2] 一覧表示エリアとコピー操作ボタンを `src/popup/popup.html` に実装する
- [X] T017 [US2] `ItemRepository.list()` の呼び出し、マスク表示ロジック、
  `navigator.clipboard.writeText()` によるコピー処理を `src/popup/popup.js` に実装する
  （依存: T009, T015, T016）
- [X] T018 [P] [US2] 最小限のスタイルを `src/popup/popup.css` に実装する

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - マスク表示の切替 (Priority: P3)

**Goal**: ユーザーがマスク表示のON/OFFを切り替えられ、状態が次回起動時も保持される
（FR-007〜FR-009）

**Independent Test**: quickstart.md「US3: マスク表示の切替」の手順（popupでトグル操作を行い、
全項目の表示が切り替わること、再起動後も状態が保持されることを確認）

### Tests for User Story 3 ⚠️

- [X] T019 [P] [US3] `setMaskEnabled()` 呼び出し後 `get()` が更新値を返すことのテストを
  `tests/unit/settingsRepository.test.js` に書く

### Implementation for User Story 3

- [X] T020 [US3] マスク表示切替トグルUIを `src/popup/popup.html` に追加する
- [X] T021 [US3] トグル操作ハンドラと、一覧内の全項目表示の再計算を `src/popup/popup.js` に
  実装する（依存: T015, T017）

**Checkpoint**: All three user stories should now be independently functional

---

## Phase 6: User Story 4 - グループによる整理 (Priority: P4)

**Goal**: グループを作成し、項目をグループに割り当てて一覧を絞り込める（FR-010〜FR-013）

**Independent Test**: quickstart.md「US4: グループによる整理」の手順（グループを作成し、
項目に割り当てて絞り込み表示を確認、グループ削除後に項目が「未分類」で残ることを確認）

### Tests for User Story 4 ⚠️

- [X] T022 [P] [US4] `GroupRepository.create()` の境界値テスト（name: 0/1/30/31文字、
  グループ数上限49→50→51件）を `tests/unit/groupRepository.test.js` に書く
- [X] T023 [P] [US4] `GroupRepository.delete()` 実行後、所属していた全Itemの`groupId`が
  `null` に更新されることのテストを `tests/unit/groupRepository.test.js` に書く

### Implementation for User Story 4

- [X] T024 [US4] `contracts/group-repository.md` の `list/create/rename/delete` を
  `src/storage/groupRepository.js` に実装する（依存: T004, T005）
- [X] T025 [US4] `ItemRepository.update()` の `groupId` 対応と `reassignGroup()` を
  `src/storage/itemRepository.js` に追加する（依存: T009, T024）
- [X] T026 [US4] グループ作成・編集・削除UIと項目へのグループ割り当てUIを
  `src/options/options.html` / `src/options/options.js` に実装する（依存: T024, T025）
- [X] T027 [US4] グループ絞り込みUIを `src/popup/popup.html` / `src/popup/popup.js` に実装する
  （依存: T017, T025）

**Checkpoint**: All four user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 全User Storyを横断した仕上げ

- [X] T028 [P] `npm test` を実行し、全ユニットテスト（T007, T008, T013, T014, T019, T022, T023）
  がPASSすることを確認する
- [ ] T029 `quickstart.md` の検証シナリオ（US1〜US4）を手動で実施し、記載された挙動と一致する
  ことを確認する
- [X] T030 [P] `README.md` に拡張機能の概要と「パッケージ化されていない拡張機能を読み込む」
  手順（quickstart.md参照）を追記する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即着手可能
- **Foundational (Phase 2)**: Setup完了後。全User Storyをブロックする
- **User Story 1 (Phase 3)**: Foundational完了後。他Storyへの依存なし
- **User Story 2 (Phase 4)**: Foundational完了後。`ItemRepository.list()`（T009）に依存するため
  実質的にUS1完了後に着手
- **User Story 3 (Phase 5)**: US2（T015, T017）に依存
- **User Story 4 (Phase 6)**: US1（T009）とUS2（T017）の両方に依存
- **Polish (Phase 7)**: 対応する全User Story完了後

### Parallel Opportunities

- Setupの `[P]` タスク（T003）はT001, T002完了後に並行可能
- Foundationalの `[P]` タスク（T005, T006）はT004と並行可能
- 各User Story内のテストタスク（`[P]`）は並行して書ける
- T012, T018, T030（スタイル・ドキュメント）は他タスクと並行可能

---

## Parallel Example: User Story 1

```bash
# Launch tests for User Story 1 together:
Task: "ItemRepository.create()の境界値テストをtests/unit/itemRepository.test.jsに書く"
Task: "ItemRepository.update()/delete()のテストをtests/unit/itemRepository.test.jsに書く"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup を完了する
2. Phase 2: Foundational を完了する（全Storyをブロックするため必須）
3. Phase 3: User Story 1 を完了する
4. **STOP and VALIDATE**: quickstart.md の US1手順で単独動作を確認する

### Incremental Delivery

1. Setup + Foundational → 基盤完成
2. US1（登録・保存・編集・削除）→ 単独検証 → MVP
3. US2（一覧表示・コピー）→ 単独検証（マスク表示・コピーが機能する状態）
4. US3（マスク切替）→ 単独検証
5. US4（グループ管理）→ 単独検証 → 全機能完成

---

## Notes

- `[P]` タスク = 異なるファイル・依存なし
- `[Story]` ラベルはUser Storyへのトレーサビリティのため付与
- 実装前にテストを書き、FAILすることを確認してから実装する
- 各タスク、または論理的なまとまりごとにコミットする
- 各チェックポイントでUser Storyの独立動作を検証してから次に進む
