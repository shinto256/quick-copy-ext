---

description: "Task list template for feature implementation"
---

# Tasks: 拡張機能名・説明の多言語対応

**Input**: Design documents from `/specs/013-manifest-i18n/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: テストタスクを含む。research.md の Decision 5 で、`manifest.json` と `_locales` の整合を
自動テストで検証することを決定しているため。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: リポジトリルート直下の `manifest.json` / `_locales/` / `tests/`
- `_locales/` は Chrome が manifest と同じ階層を探索するため、`src/` 配下ではなくルートに置く
- 本要件では `src/` 配下を変更しない

## この機能の構造上の注意

3つのユーザーストーリーは同じ成果物（`manifest.json` + `_locales/`）の上に成立する。とくに
**US2（日本語環境の表示が変わらない）と US3（未対応言語でのフォールバック）は、Phase 2 の
Foundational を完了した時点で振る舞いとして満たされる**。`default_locale: "ja"` と
`_locales/ja/messages.json` が揃えば、日本語環境は日本語で表示され、未対応言語も日本語へ
フォールバックするため。

したがって US2 / US3 のフェーズには新規の実装タスクを置かず、検証タスクのみを置く。架空の実装
タスクを作らないことで、どのフェーズが何を生み出すのかを正確に保つ。新しい振る舞いを実装として
追加するのは US1（英語表示）のみである。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 変更前の状態を記録し、回帰判定の基準を作る

- [X] T001 `npm test` を実行し、変更前のテスト件数（10ファイル・209件パス）を記録する。SC-005 の判定基準になる
- [X] T002 `manifest.json` の現在の `name` と `description` の文字列を記録する。SC-002（日本語環境で従来と同一）の判定基準になる

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 拡張機能が読み込める状態を作る。`default_locale` と `_locales` は対で必須のため、この
フェーズが未完成だと拡張機能自体が読み込めず、いずれのユーザーストーリーも検証できない

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 `tests/unit/localeMessages.test.js` を新規作成し、`data-model.md` の VR-001〜VR-007 を検証するテストを書く。`describe` を2つに分ける。(a) 基盤の整合（VR-001〜VR-006）: `default_locale` のディレクトリと `messages.json` の存在、manifest 内の全 `__MSG_*__` 参照に対応するキーの存在、全ロケール間のキー集合の一致、`extDescription` の132文字以内、`extName` の全ロケール一致、全メッセージの `message` が非空。(b) 英語ロケール（VR-007）: `_locales/en/messages.json` の存在と `extDescription.message` が `Copy your registered text snippets to the clipboard with a single click.` に完全一致。`chrome.storage.local` のmockは使わず、`node:fs` でファイルを読んで検証する
- [X] T004 `npx vitest run tests/unit/localeMessages.test.js` を実行し、テストが失敗することを確認する。`_locales` が存在しないため (a)(b) の両方が失敗するのが期待結果
- [X] T005 [P] `_locales/ja/messages.json` を新規作成し、`extName.message` に `Quick Copy`、`extDescription.message` に `登録した定型文字列をワンクリックでコピーできる拡張機能` を定義する。形式は `contracts/locale-messages-contract.md` の契約2に従う
- [X] T006 [P] `manifest.json` を変更し、`name` を `__MSG_extName__`、`description` を `__MSG_extDescription__` に置き換え、`default_locale` に `ja` を追加する。`manifest_version` / `version` / `permissions` / `action` / `side_panel` / `background` / `icons` は変更しない
- [X] T007 `npx vitest run tests/unit/localeMessages.test.js` を実行し、(a) 基盤の整合のテストがパスすることを確認する。(b) 英語ロケールのテストは `_locales/en/messages.json` が未作成のため失敗したままであるのが期待結果
- [ ] T008 `specs/013-manifest-i18n/quickstart.md` の Step 2 を実施し、拡張機能が警告・エラーなしで読み込めることを確認する（FR-006 / SC-004）
- [X] T009 T005 と T006 をまとめてコミットする（`_locales/ja/messages.json` / `manifest.json` / `tests/unit/localeMessages.test.js`）。この時点で拡張機能は読み込める状態になっている

**Checkpoint**: 拡張機能が読み込める。日本語環境の表示と未対応言語のフォールバックは、この時点で
振る舞いとして成立している（US2 / US3 の検証が可能）

---

## Phase 3: User Story 1 - 英語環境で拡張機能の内容を理解できる (Priority: P1) 🎯 MVP

**Goal**: ブラウザの表示言語が英語の環境で、拡張機能の名称と説明が英語で表示される

**Independent Test**: ブラウザの表示言語を英語に設定して `chrome://extensions` を開き、説明が英語で
表示され日本語の文字が0文字であることを確認する

### Tests for User Story 1

> **NOTE**: 対応するテストは T003 で作成済み（(b) 英語ロケールの `describe`）。T004 / T007 で失敗する
> ことを確認してある

- [X] T010 [US1] `npx vitest run tests/unit/localeMessages.test.js` を実行し、(b) 英語ロケールのテストが失敗していることを再確認する（実装前の最終確認）

### Implementation for User Story 1

- [X] T011 [US1] `_locales/en/messages.json` を新規作成し、`extName.message` に `Quick Copy`、`extDescription.message` に `Copy your registered text snippets to the clipboard with a single click.` を定義する。形式は `contracts/locale-messages-contract.md` の契約2に従う。地域付きディレクトリ（`en_US` / `en_GB`）は作らない
- [X] T012 [US1] `npx vitest run tests/unit/localeMessages.test.js` を実行し、(a)(b) の全テストがパスすることを確認する（VR-001〜VR-007 充足）
- [ ] T013 [US1] `specs/013-manifest-i18n/quickstart.md` の Step 4 を実施し、英語環境で名称が `Quick Copy`、説明が英語で表示され、日本語の文字が0文字であること、および拡張機能のカードに警告・エラーが表示されないことを確認する（SC-001 / SC-004 / SC-007 / SC-009 / FR-006）
- [ ] T014 [US1] `specs/013-manifest-i18n/quickstart.md` の Step 4 の「地域付きロケールの確認」を実施し、`English (United Kingdom)` 環境でも `_locales/en/` が使われることを確認する（Edge Case）
- [X] T015 [US1] `_locales/en/messages.json` をコミットする

**Checkpoint**: US1 が独立して動作し検証可能。この時点が MVP

---

## Phase 4: User Story 2 - 日本語環境の表示が変わらない (Priority: P2)

**Goal**: 日本語環境の利用者に対し、変更前と同一の名称と説明が表示される

**Independent Test**: ブラウザの表示言語を日本語に設定して `chrome://extensions` を開き、T002 で
記録した変更前の文字列と一致することを確認する

**実装タスクなし**: Phase 2 の T005 / T006 で振る舞いとして成立済み（`default_locale: "ja"` と
`_locales/ja/messages.json`）。本フェーズは回帰が起きていないことの検証のみを行う

- [ ] T016 [US2] `specs/013-manifest-i18n/quickstart.md` の Step 3 を実施し、日本語環境の名称と説明が T002 で記録した文字列と一致すること、および拡張機能のカードに警告・エラーが表示されないことを確認する（SC-002 / SC-004 / FR-006）
- [X] T017 [US2] `npx vitest run tests/unit/localeMessages.test.js` の VR-005 の結果を確認し、`extName` が日本語・英語で同一であることを確認する（SC-007）

**Checkpoint**: US1 と US2 がともに成立

---

## Phase 5: User Story 3 - 未対応の言語環境でも意味のある表示になる (Priority: P3)

**Goal**: 日本語・英語以外の表示言語環境で、既定の言語である日本語の名称と説明が表示される

**Independent Test**: ブラウザの表示言語をドイツ語などに設定して `chrome://extensions` を開き、
日本語の名称と説明が表示され空欄にならないことを確認する

**実装タスクなし**: Phase 2 の T006（`default_locale: "ja"`）で振る舞いとして成立済み。本フェーズは
フォールバックが実際に働くことの検証のみを行う

- [ ] T018 [US3] `specs/013-manifest-i18n/quickstart.md` の Step 5 を実施し、ドイツ語・フランス語・中国語の3環境で日本語の名称と説明が表示され、空欄が0件・警告とエラーが0件であることを確認する（SC-003 / SC-004）

**Checkpoint**: 全ユーザーストーリーが独立して成立

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 複数ストーリーに跨る確認と、リポジトリ全体の整合

- [X] T019 [P] `README.md` の仕様リンク一覧の末尾（`specs/011-sidepanel-i18n/spec.md` の次）に `specs/013-manifest-i18n/spec.md`（拡張機能名・説明の多言語対応）を追加する。既存の全spec列挙の慣例に従う。**実施時の判明事項**: `README.md` の一覧は011で止まっており、`specs/012-restore-last-group` が未追記のまま残っている。012の追記は req-000017 の範囲外のため本タスクでは行わず、別途対応の判断に委ねる
- [X] T020 [P] `README.md` の動作確認手順一覧に `specs/013-manifest-i18n/quickstart.md` を追加する
- [ ] T021 `specs/013-manifest-i18n/quickstart.md` の Step 6 を実施し、ブラウザの表示言語とサイドパネル内で選択した表示言語が互いに影響しないことを2通りの組み合わせで確認する（SC-006 / FR-004 / FR-005）
- [ ] T022 `specs/013-manifest-i18n/quickstart.md` の Step 7 を実施し、項目登録・コピー・マスク切替・タブ切替・並び替え・言語切替の既存機能に回帰がないことを確認する（FR-005）
- [X] T023 `npm test` を実行し、T001 で記録した既存209件を含む全テストがパスすることを確認する（SC-005）
- [X] T024 `README.md` の変更をコミットする
- [X] T025 `reqord impact analyze` を実行し、影響範囲があれば Reqord の該当要件・仕様の更新を提案する（CLAUDE.md 開発フロー4）
- [ ] T026 `reqord req implement req-000017` を実行し、要件のステータスを `implemented` へ遷移させる

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即開始できる
- **Foundational (Phase 2)**: Setup 完了後。全ユーザーストーリーをブロックする
- **User Story 1 (Phase 3)**: Foundational 完了後
- **User Story 2 (Phase 4)**: Foundational 完了後。US1 には依存しない（Phase 2 完了時点で検証可能）
- **User Story 3 (Phase 5)**: Foundational 完了後。US1 / US2 には依存しない
- **Polish (Phase 6)**: US1 完了後（T021 の組み合わせ確認が英語ロケールを必要とするため）

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 後に開始可能。他ストーリーへの依存なし
- **User Story 2 (P2)**: Foundational 後に検証可能。実装タスクを持たない
- **User Story 3 (P3)**: Foundational 後に検証可能。実装タスクを持たない

### Within Each User Story

- テストを先に書き、失敗を確認してから実装する（T003 → T004 → 実装 → T007 / T012）
- 実装後に自動テスト、その後に手動検証、最後にコミット

### Parallel Opportunities

- T005（`_locales/ja/messages.json` 作成）と T006（`manifest.json` 変更）は別ファイルで相互依存が
  ないため並行可能。ただし両方が完了するまで拡張機能は読み込めないため、T007 以降は両方の完了を待つ
- T019 と T020 はいずれも `README.md` の別セクションへの追記だが、同一ファイルのため実際には
  1回の編集でまとめるのが安全。並行実行する場合は編集競合に注意する
- 手動検証タスク（T016 / T018 / T021 / T022）はブラウザの表示言語設定を切り替える必要があり、
  設定が共有状態のため並行実行できない。表示言語ごとにまとめて実施するのが効率的

---

## Parallel Example: Phase 2 Foundational

```bash
# 別ファイルへの変更なので並行可能
Task: "_locales/ja/messages.json を新規作成する（T005）"
Task: "manifest.json の name / description / default_locale を変更する（T006）"

# 両方の完了後に実行
Task: "npx vitest run tests/unit/localeMessages.test.js（T007）"
```

## 手動検証の効率的な順序

ブラウザの表示言語切り替えは再起動を伴うため、言語ごとにまとめて実施する。

```text
1. 日本語のまま: T008（読み込み確認）→ T016（日本語表示）→ T021 の組み合わせ1 → T022（回帰確認）
2. English に切替・再起動: T013 → T021 の組み合わせ2
3. English (UK) に切替・再起動: T014
4. Deutsch / Français / 中文 に順次切替・再起動: T018
5. 元の表示言語に戻す
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup を完了する（ベースライン記録）
2. Phase 2: Foundational を完了する（拡張機能が読み込める状態。US2 / US3 の振る舞いもここで成立）
3. Phase 3: User Story 1 を完了する（英語表示）
4. **STOP and VALIDATE**: 英語環境で独立に検証する
5. この時点で本要件の中核価値は揃っている

### Incremental Delivery

1. Setup + Foundational → 拡張機能が読み込める。日本語環境と未対応言語の振る舞いが成立
2. US1 追加 → 英語環境で英語表示（MVP）
3. US2 / US3 の検証 → 回帰とフォールバックの確認
4. Polish → README 更新、独立性と既存機能の回帰確認、Reqord への反映

### 注意

本要件は実装の実体が JSON 2ファイルと `manifest.json` の変更のみで、規模が小さい。複数人での
並行作業を前提とした分割は行わず、1人が Phase 順に進めることを想定している。

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- テストは実装前に書き、失敗を確認してから実装する
- コミットは Phase 2 完了時（T009）、US1 完了時（T015）、Polish 完了時（T024）の3回にまとめる
- `default_locale` と `_locales` は対で必須。片方だけの状態でコミットしない
- CLAUDE.md の運用ルールにより `/speckit-taskstoissues` は使用しない。Issue化が必要な場合は
  `reqord task create` / `reqord task sync` を使う
- 実装中に仕様からの変更が必要になった場合、Constitution の運用ルールに従い実装を停止し、
  `feedback` ラベル付きの GitHub Issue を作成して Reqord への反映を提案する
