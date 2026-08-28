---

description: "Task list template for feature implementation"
---

# Tasks: サイドパネルUI刷新

**Input**: Design documents from `/specs/002-side-panel-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `itemFilter.js` はcontracts/item-filter-contract.mdでユニットテスト対象と定義済みのため含める。DOM組み立て自体（sidepanel.js）は001の方針を踏襲しユニットテスト対象外（quickstart.mdの手動検証で担保）。

**Organization**: タスクはspec.mdのUser Story（優先度順）ごとにグループ化。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（別ファイル・依存なし）
- **[Story]**: 対応するUser Story（US1〜US4）
- 各タスクに具体的なファイルパスを明記

## Path Conventions

単一プロジェクト構成。`manifest.json` はリポジトリルート、UIは `src/sidepanel/`、
背景スクリプトは `src/background/`、データ層は `src/storage/`（変更なし）、テストは `tests/unit/`。

---

## Phase 1: Setup

**Purpose**: 新規UI・背景スクリプトのファイル雛形を用意し、既存資産（`maskDisplay.js`）を
先に移設しておく（Foundational以降のタスクが依存するため）

- [X] T001 [P] `src/sidepanel/sidepanel.html` / `src/sidepanel/sidepanel.css` / `src/sidepanel/sidepanel.js` / `src/sidepanel/itemFilter.js` の空ファイルを作成する
- [X] T002 `src/popup/maskDisplay.js` を `src/sidepanel/maskDisplay.js` に移設する（内容変更なし）。`tests/unit/maskDisplay.test.js` のimportパスを新しい配置先に更新する
- [X] T003 [P] `src/background/background.js` の空ファイルを作成する
- [X] T004 `manifest.json` を更新する: `action.default_popup` と `options_page` を削除し、`permissions` に `sidePanel` を追加、`side_panel.default_path` を `src/sidepanel/sidepanel.html` に設定、`background.service_worker` を `src/background/background.js` に設定する（contracts/sidepanel-behavior-contract.md準拠）

**Checkpoint**: 拡張機能を読み込むとエラーなく認識される状態（中身は未実装で構わない）。`npm run test` で `maskDisplay.test.js` が新パスでもパスすることを確認する

---

## Phase 2: Foundational（全User Story共通の前提）

**Purpose**: どのUser Storyより先に完了させる必要がある共通基盤

**⚠️ CRITICAL**: このフェーズ完了までUser Storyの実装に着手しない

- [X] T005 `src/background/background.js` に `chrome.runtime.onInstalled` リスナーを実装し、`chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` を呼び出す（contracts/sidepanel-behavior-contract.md準拠）
- [X] T006 `src/sidepanel/sidepanel.html` に基本DOM構造を実装する: ヘッダー（検索入力欄・マスク切替トグル・項目追加アイコン）、タブ領域（グループタブ+「未分類」+「＋」新規グループ）、一覧領域（カードコンテナ・空状態メッセージ）、入力用UI領域（登録/編集フォームのコンテナ、初期状態は非表示）（contracts/sidepanel-behavior-contract.md準拠）
- [X] T007 [P] `src/sidepanel/sidepanel.css` を実装する: タブ行・カード一覧・ヘッダーレイアウトを見本UI（会社情報タブ+カード形式一覧）に準拠したスタイルにする
- [X] T008 [P] `src/sidepanel/itemFilter.js` に `filterItemsByTabAndSearch(items, selectedGroupId, searchTerm)` を実装する（contracts/item-filter-contract.md準拠。groupId===null↔"__unassigned__"対応、name部分一致検索、value検索は対象外）
- [X] T009 [P] `tests/unit/itemFilter.test.js` を作成し、contracts/item-filter-contract.mdの「テスト観点」（未分類/通常グループ絞り込み、検索併用、大文字小文字非正規化、0件時空配列）を検証する
- [X] T010 `src/sidepanel/sidepanel.js` にモジュール骨格を実装する: `ItemRepository` / `GroupRepository` / `SettingsRepository` / `maskDisplay.formatDisplayValue`（T002で移設済みの `./maskDisplay.js` からimport） / `itemFilter.filterItemsByTabAndSearch` をimportし、モジュールスコープの状態変数（`selectedTabId` / `searchTerm` / `editingItemId` / `isFormOpen`）を宣言する（data-model.md「画面内一時状態」準拠）。この時点では初期化のみで描画ロジックは未実装でよい

**Checkpoint**: 拡張機能アイコンをクリックするとパネルが開き、他タブ操作中も閉じないことを確認できる（中身の一覧・操作は未実装）

---

## Phase 3: User Story 1 - 常駐パネルからワンクリックでコピーする (Priority: P1) 🎯 MVP

**Goal**: 選択中タブの項目をカード表示し、コピー操作とヘッダーのマスク切替トグルが機能する

**Independent Test**: 既存データ（項目・未分類扱い含む）がある状態でパネルを開き、カードのコピー操作でクリップボードに値が入り成功フィードバックが出ること、ヘッダートグル1操作で全カードの表示がマスク⇔平文に切り替わることを確認する

### Implementation for User Story 1

- [X] T011 [US1] `sidepanel.js` に一覧描画関数 `renderList()` を実装する: `ItemRepository.list()` / `SettingsRepository.get()` を呼び出し、`itemFilter.filterItemsByTabAndSearch(items, selectedTabId, searchTerm)` の結果をカード（名前太字＋`formatDisplayValue`による値表示＋コピー操作）としてDOMに描画し、0件時は空状態を表示する
- [X] T012 [US1] カードのコピー操作を実装する: クリックで `navigator.clipboard.writeText(item.value)` を実行し、成功時は成功フィードバック、失敗時は失敗フィードバックを表示する（req-000002準拠、値は表示状態に関わらず原文をコピー）
- [X] T013 [US1] ヘッダーのマスク切替トグルを実装する: 初期表示時に `SettingsRepository.get()` の `maskEnabled` を反映し、変更イベントで `SettingsRepository.setMaskEnabled()` を呼び出した上で `renderList()` を再実行する（FR-012: メニューを開く操作を挟まない1操作での切替）
- [X] T014 [US1] 初期表示ロジックを実装する: パネルを開いた際、`selectedTabId` を「未分類」または先頭のグループ（存在する場合）に初期化し `renderList()` を呼び出す

**Checkpoint**: User Story 1が単独で動作・検証可能（既存グループ・項目がある前提で一覧表示とコピー、マスク切替が機能する）

---

## Phase 4: User Story 2 - タブ切替でグループごとに項目を見る (Priority: P1)

**Goal**: グループがタブとして表示され、タブ切替で該当項目のみに絞り込まれ、「＋」から新規グループを作成できる

**Independent Test**: 複数グループに項目を登録した状態でタブを切り替え、各タブに該当グループの項目のみが表示されること、「＋」から新規グループを作成しタブが増えることを確認する

### Implementation for User Story 2

- [X] T015 [US2] `sidepanel.js` にタブバー描画関数 `renderTabs()` を実装する: `GroupRepository.list()` の結果を「未分類」タブ＋各グループタブ＋末尾「＋」として描画し、`selectedTabId` に一致するタブを選択状態で表示する
- [X] T016 [US2] タブクリック時の切替ハンドラを実装する: `selectedTabId` を更新し、`renderList()` を再実行する（このタスクでは検索リセットはUser Story 4側で追加するため未着手のままでよい）
- [X] T017 [US2] 「＋」タブ操作で新規グループ作成用の簡易入力（インライン入力欄またはプロンプト相当のパネル内UI）を実装し、`GroupRepository.create(name)` 呼び出し後に `renderTabs()` を再実行する。`ValidationError`（1〜30文字超過等）はエラーメッセージとしてパネル内に表示する
- [X] T018 [US2] パネル初期表示時に `renderTabs()` を呼び出すよう `sidepanel.js` の初期化処理を更新する（T014の初期化ロジックと合流させる）

**Checkpoint**: User Story 1・2が両方単独で動作可能（タブ切替と一覧・コピー・マスクが揃った状態）

---

## Phase 5: User Story 3 - 画面遷移せずにその場で項目を登録・編集する (Priority: P2)

**Goal**: 項目の新規登録・編集・削除、グループの名称編集・削除がすべてパネル内（画面遷移なし）で完結する

**Independent Test**: パネルを開いたまま項目追加操作を行い、名前・値・グループを入力して保存すると画面遷移なしに一覧へ即時反映されること、カードの編集・削除、グループの名称変更・削除が画面遷移なしに行えることを確認する

### Implementation for User Story 3

- [X] T019 [US3] `sidepanel.js` に項目登録・編集用の入力UI開閉関数（`openItemForm(item = null)` / `closeItemForm()`）を実装する: `isFormOpen` / `editingItemId` を更新し、フォーム表示中は名前・値・所属グループ（`GroupRepository.list()` から選択肢生成、未分類含む）の入力欄を表示する
- [X] T020 [US3] ヘッダーの項目追加アイコン操作で `openItemForm()` を呼び出すよう配線する
- [X] T021 [US3] 各カードにケバブメニュー（編集/削除）を実装する: 編集選択で `openItemForm(item)` を呼び出し既存値を入力欄に反映する
- [X] T022 [US3] 入力用UIの保存処理を実装する: `editingItemId` の有無で `ItemRepository.create()` / `ItemRepository.update()` を呼び分け、成功時は `closeItemForm()` と `renderList()`（グループ新規選択時は `renderTabs()` も）を実行する。`ValidationError`（文字数超過・上限500件到達等）はフォーム内にエラー表示し、フォームは開いたままにする（req-000001準拠）
- [X] T023 [US3] カードの削除操作を実装する: 削除確認後 `ItemRepository.remove(item.id)` を呼び出し、`renderList()` を再実行する
- [X] T024 [US3] `renderTabs()` を更新し、「未分類」を除く各グループタブにケバブメニュー（名称編集/削除）を追加する（contracts/sidepanel-behavior-contract.md準拠）。名称編集選択時はタブ内インライン入力を表示し、`GroupRepository.rename(id, name)` 呼び出し後 `renderTabs()` を再実行する。`ValidationError` はパネル内に表示する
- [X] T025 [US3] T024のケバブメニューの削除選択時の処理を実装する: 確認後 `GroupRepository.remove(id)` を呼び出し、`renderTabs()` を再実行する。削除したタブが選択中だった場合は `selectedTabId` を「未分類」に戻し `renderList()` を再実行する（req-000004: 所属項目は未分類へ）
- [X] T026 [US3] パネルを閉じた（`document` の `visibilitychange` 等で検知）際に開いていた入力用UIの未保存内容を破棄する処理を実装する（Edge Cases準拠。次回パネルを開いた際は `isFormOpen: false` から開始する）

**Checkpoint**: User Story 1〜3が単独・組み合わせともに動作可能（一覧・コピー・マスク・タブ切替・登録編集削除・グループ管理がすべて画面遷移なしで完結）

---

## Phase 6: User Story 4 - 一覧から目的の項目を検索する (Priority: P3)

**Goal**: 検索欄で選択中タブ内の項目を名前で絞り込め、タブ切替時に検索はリセットされる

**Independent Test**: 複数項目が登録された状態で検索欄にキーワードを入力し該当項目のみに絞り込まれること、検索欄を空にすると解除されること、別タブに切り替えると検索欄が自動でクリアされることを確認する

### Implementation for User Story 4

- [X] T027 [US4] ヘッダーの検索入力欄に入力イベントハンドラを実装する: `searchTerm` を更新し `renderList()` を再実行する（SC-006: 入力から再描画まで150ms以内）
- [X] T028 [US4] T016のタブ切替ハンドラを更新し、タブ切替時に `searchTerm` をクリアし検索入力欄のDOM値も空にしてから `renderList()` を再実行するようにする（Clarifications / FR-013準拠）
- [X] T029 [US4] `tests/unit/itemFilter.test.js` に、検索語ありでタブ絞り込み結果からさらに絞り込まれるケースが未カバーであれば追加する（T009で既にカバー済みなら本タスクは重複確認のみ）

**Checkpoint**: 全User Story（US1〜US4）が独立・組み合わせともに動作可能

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 旧UIの撤去と全体検証

- [X] T030 `src/popup/`（`popup.html` / `popup.css` / `popup.js`）を削除する（`maskDisplay.js` はT002で既に `src/sidepanel/` へ移設済みのため対象外）
- [X] T031 `src/options/`（`options.html` / `options.css` / `options.js`）を削除する
- [X] T032 `README.md` にpopup/options運用の記載があれば、サイドパネルUIに合わせて更新する
- [X] T033 `npm run test` を実行し全ユニットテスト（itemRepository/groupRepository/settingsRepository/maskDisplay/itemFilter）がパスすることを確認する
- [ ] T034 `quickstart.md` の手順（1〜6）に沿って手動検証を行い、全項目を確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし、即着手可能
- **Foundational (Phase 2)**: Setup完了後。全User Storyをブロックする
- **User Stories (Phase 3〜6)**: Foundational完了後に着手可能。優先度順（US1→US2→US3→US4）に進めることを推奨するが、US1とUS2は独立実装可能
- **Polish (Phase 7)**: 実施対象のUser Story完了後

### User Story Dependencies

- **US1 (P1)**: Foundational完了後に着手可能。他Storyへの依存なし
- **US2 (P1)**: Foundational完了後に着手可能。US1のカード描画（`renderList`）を呼び出すが、US1のタスクと並行実装可能（`renderTabs`と`renderList`は別関数）
- **US3 (P2)**: US1（`renderList`）・US2（`renderTabs`）の関数が存在することを前提とする
- **US4 (P3)**: US2（タブ切替ハンドラ）の存在を前提とする（T028でT016を更新するため）

### Within Each User Story

- 一覧描画・タブ描画などの基盤関数が先、イベント配線・エラーハンドリングが後
- Story内の実装完了後、Checkpointで独立動作を確認してから次のStoryへ

### Parallel Opportunities

- Setup（T001, T003）は並行可能
- Foundational内 T007 / T008 / T009 は並行可能（異なるファイル）
- US1（Phase 3）とUS2（Phase 4）はFoundational完了後、担当者が異なれば並行実装可能
- Polish内 T032（README更新）は他タスクと並行可能

---

## Parallel Example: Foundational

```bash
Task: "src/sidepanel/sidepanel.css を見本UI準拠で実装する"
Task: "src/sidepanel/itemFilter.js に filterItemsByTabAndSearch を実装する"
Task: "tests/unit/itemFilter.test.js を作成する"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 完了
2. Phase 2: Foundational 完了（必須）
3. Phase 3: User Story 1 完了
4. **STOP and VALIDATE**: 既存データでの一覧表示・コピー・マスク切替を単独検証
5. 必要ならここでデモ・レビュー

### Incremental Delivery

1. Setup + Foundational → 基盤完成（パネルは開くが中身なし）
2. US1追加 → 一覧・コピー・マスク切替を検証（MVP）
3. US2追加 → タブ切替・グループ作成を検証
4. US3追加 → 登録・編集・削除・グループ管理を検証（options.html相当を完全代替）
5. US4追加 → 検索を検証
6. Polish → 旧UI撤去・全体回帰テスト

## Notes

- [P]タスク = 異なるファイル・依存なし
- [Story]ラベルはUser Storyへのトレーサビリティ用
- 各Storyは独立して完結・検証可能
- Story完了ごとにcheckpointで独立動作を確認してから次へ進む
- 旧`popup/`（`maskDisplay.js`除く）・`options/`はUS3完了までは参照されなくなるが実体は残る。Polish（Phase 7）で撤去する
