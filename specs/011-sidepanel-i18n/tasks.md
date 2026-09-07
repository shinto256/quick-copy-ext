---

description: "Task list for サイドパネルの多言語対応（日本語・英語）"
---

# Tasks: サイドパネルの多言語対応（日本語・英語）

**Input**: Design documents from `/specs/011-sidepanel-i18n/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: 含める。`technical.yaml` の決定「Unit testを導入する(vitest + chrome API mock)」に従い、
純関数（`src/i18n/index.js` の `t()` / `setLanguage` / `getLanguage`、辞書のキー網羅性）と
Repository層（`SettingsRepository.setLanguage`）はユニットテスト対象とする。
`applyStaticTranslations` によるDOM反映、`sidepanel.js` / `groupPanel.js` の再描画配線は
DOM操作が中心のため、既存specと同方針でユニットテスト対象外とし、
[quickstart.md](./quickstart.md) の手動検証で担保する。

**Organization**: タスクはユーザーストーリー単位でまとめる。

**⚠️ US1 と US2 は分けてリリースできない**: US1（切替の仕組み）だけでは翻訳が
その他メニュー以外に及ばず機能として不完全になり、US2（画面全体の翻訳網羅）だけでは
切り替える手段がない。spec の両ストーリーの「Why this priority」に明記のとおり、
**両方を1つの実装フェーズとして完了させる。** US3（検証エラーの是正、P2）は独立して追加できる。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（別ファイル・未完了タスクへの依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US3）
- 説明には対象ファイルのパスを含める

## Path Conventions

単一プロジェクト構成。リポジトリルート直下の `src/` と `tests/` を使う。ビルドは行わない。

---

## Phase 1: Setup

- [X] T001 `npm test` を実行し、変更前の全テストがパスすることを確認する（ベースライン記録。`tests/unit/` 配下9ファイル・183テスト）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全ユーザーストーリーが依存する翻訳基盤（辞書・`t()`・言語設定の保存）を用意する

**⚠️ CRITICAL**: このフェーズが完了するまで、いずれのユーザーストーリーも着手できない

- [X] T002 [P] `tests/unit/i18n.test.js` を新規作成し、`t()` の展開・辞書のキー網羅性・単数複数分岐のテスト観点（[contracts/i18n-contract.md](./contracts/i18n-contract.md) の「テスト観点」の全項目）を書く。実装前なので失敗することを確認する
- [X] T003 [P] `src/i18n/ja.js` を新規作成し、[contracts/i18n-contract.md](./contracts/i18n-contract.md) の「翻訳キー一覧」表に定義された全58キーの日本語辞書をデフォルトエクスポートする。件数を含むキー（`tabs.openPanelAria` / `selection.count` / `selection.confirmDelete` / `groupPanel.itemCountAria` / `groupPanel.confirmDelete`）は関数として定義する
- [X] T004 [P] `src/i18n/en.js` を新規作成し、同じ58キーの英語辞書をデフォルトエクスポートする。件数を含むキーは `count === 1` で単数形・それ以外で複数形を返す関数にする（[research.md](./research.md) R-003）。`moreMenu.languageJa` / `moreMenu.languageEn` の値は `ja.js` と同一にする（「日本語」「English」。spec FR-002a）
- [X] T005 `src/i18n/index.js` を新規作成し、`setLanguage(lang)` / `getLanguage()` / `t(key, params)` / `applyStaticTranslations(root)` を実装して T002 をパスさせる。`t()` はキー欠落時に例外を投げずキー文字列を返す。`setLanguage` は無効な値を `"ja"` として扱う（[contracts/i18n-contract.md](./contracts/i18n-contract.md)）
- [X] T006 [P] `tests/unit/settingsRepository.test.js` に `setLanguage` / `get` の異常値丸めのテスト観点（[contracts/settings-language-contract.md](./contracts/settings-language-contract.md)）を追加する。実装前なので失敗することを確認する
- [X] T007 `src/storage/settingsRepository.js` に `VALID_LANGUAGES = ["ja", "en"]`、`DEFAULT_SETTINGS` への `language: "ja"` 追加、`setLanguage(language)` を実装して T006 をパスさせる。`get()` に、保存値が `VALID_LANGUAGES` に含まれない場合 `"ja"` に丸める処理を追加する
- [X] T008 `npm test` を実行し、T002〜T007 の追加分と既存テストがすべてパスすることを確認する

**Checkpoint**: 翻訳基盤（辞書・`t()`・言語設定の保存）が揃った。ユーザーストーリーの実装に着手できる

---

## Phase 3: User Story 1 & 2 - 言語を切り替えると画面全体が選んだ言語で表示される (Priority: P1) 🎯 MVP

**Goal**: その他メニューに「言語」セクションを追加し、切り替えるとサイドパネル内の全表示文字列が選んだ言語になる状態にする

**Independent Test**: その他メニューを開いて「言語」セクションが表示されていることを確認し、日本語以外を選んで表示が切り替わること、サイドパネルを閉じて再度開いても選んだ言語のまま起動することを確認する。あわせて英語に切り替えた状態で、検索欄・項目登録フォーム・項目カード・タブ・全グループパネル・選択モードのすべてに日本語の文字列が残っていないことを確認する（[quickstart.md](./quickstart.md) セクション1〜3）

### Implementation

- [X] T009 [US1] `src/sidepanel/sidepanel.html` の静的なラベル・プレースホルダー・`aria-label`・`title`に `data-i18n-text` / `data-i18n-placeholder` / `data-i18n-aria-label` / `data-i18n-title` 属性を付与する（検索欄、マスク切替、項目追加ボタン、その他のメニューを開くボタン、タブの`aria-label`、選択ツールバーの静的ボタン群（グループ変更・削除・キャンセル・変更先グループラベル・適用・キャンセル）、全グループパネルの絞り込み・閉じるボタン・空状態・グループを追加ボタン、項目登録フォームの各ラベル・未分類の選択肢・保存/キャンセル）。[contracts/i18n-contract.md](./contracts/i18n-contract.md) の「翻訳キー一覧」表のキーをそのまま使う
- [X] T010 [US1] `src/sidepanel/sidepanel.js` の `init()` を変更し、`SettingsRepository.get()` から `currentLanguage` を復元して `i18n.setLanguage(currentLanguage)` を呼び、続けて `applyStaticTranslations(document)` を呼んでから既存の `renderTabs()` / `renderList()` を実行する（[contracts/language-switch-ui-contract.md](./contracts/language-switch-ui-contract.md) の「5. 初期化」）
- [X] T011 [US1] `src/sidepanel/sidepanel.js` の `renderMoreMenu()` に、既存の「テーマ」セクションと同じ構造で `LANGUAGE_OPTIONS`（`ja` / `en`、ラベルは `moreMenu.languageJa` / `moreMenu.languageEn`）による「言語」セクションを追加する。見出しは `t("moreMenu.language")`、現在の `currentLanguage` と一致する選択肢に `.active` を付ける（[contracts/language-switch-ui-contract.md](./contracts/language-switch-ui-contract.md) の「1. 「言語」セクション」）
- [X] T012 [US1] `src/sidepanel/sidepanel.js` に `selectLanguage(lang)` を追加する。`currentLanguage` の更新 → `SettingsRepository.setLanguage(lang)` → `i18n.setLanguage(lang)` → `applyStaticTranslations(document)` → `renderTabs()` → `renderList()` → `groupPanel.refresh()` → `renderMoreMenu()` の順で呼ぶ。`moreMenuOpen` は変更しない（その他メニューは開いたまま新しい言語で再表示される。spec US1 シナリオ7）。「言語」セクションの各選択肢のクリックハンドラから呼ぶ（[contracts/language-switch-ui-contract.md](./contracts/language-switch-ui-contract.md) の「2. `selectLanguage(lang)`」）
- [X] T013 [US2] `src/sidepanel/sidepanel.js` の `createItemCard` 内の文字列を `t()` に置き換える: `checkbox` の `aria-label`（`itemCard.selectAria`）、`copyButton` の `aria-label`（`itemCard.copyAria`）・`title`（`itemCard.copyTitle`）、`kebabButton` の `aria-label`（`itemCard.kebabAria`）、編集ボタン（`itemCard.edit`）、削除ボタン（`itemCard.delete`）、削除確認ダイアログ（`itemCard.confirmDelete`）
- [X] T014 [US2] `src/sidepanel/sidepanel.js` の `copyValue` 呼び出し元のコピー成功・失敗表示（`copyStatus.success` / `copyStatus.failure`）、`renderList()` 内の空状態文言（`itemList.empty` / `itemList.emptyFiltered`）を `t()` に置き換える
- [X] T015 [US2] `src/sidepanel/sidepanel.js` の `createTabElement` の「未分類」ラベルを `t("common.unassigned")` に、`createPanelOpenButton` のボタン文言（`tabs.openPanelButton`）・`aria-label`（`tabs.openPanelAria`）・`title`（`tabs.openPanelTitle`）を `t()` に置き換える
- [X] T016 [US2] `src/sidepanel/sidepanel.js` の `updateSelectionToolbar` の選択件数表示（`selection.count`）、一括削除の確認ダイアログ（`selection.confirmDelete`）を `t()` に置き換える
- [X] T017 [US2] `src/sidepanel/groupPanel.js` に `import { t } from "../i18n/index.js";` を追加し、`tabLabel(tabId)` の未分類ラベルを `t("common.unassigned")` に置き換える。`createRow` 内の三点リーダーの `aria-label`（`groupPanel.rowMenuAria`、`tabLabel(tabId)` の結果を `label` パラメータとして渡す）・件数の `aria-label`（`groupPanel.itemCountAria`）・「名称変更」（`groupPanel.rename`）・「削除」（`groupPanel.delete`）・インライン入力の `aria-label`（`groupPanel.nameAria`）を `t()` に置き換える
- [X] T018 [US2] `src/sidepanel/groupPanel.js` の `validationMessage`（`errorNameLength` / `errorLimit`）、削除確認ダイアログ（`groupPanel.confirmDelete`）、汎用エラー文言（`errorRenameGeneric` / `errorCreateGeneric` / `errorDeleteGeneric` / `errorReorderGeneric`）を `t()` に置き換える。あわせて `initGroupPanel` の戻り値に `refresh()` を追加する（`panelOpen` のときだけ `renderList()` を呼ぶ。開閉状態は変えない。[contracts/language-switch-ui-contract.md](./contracts/language-switch-ui-contract.md) の「3. `groupPanel.refresh()`」）
- [X] T019 [US1] `npm test` を実行し、`tests/unit/` の全テストがパスすることを確認する（回帰なし。本フェーズはDOM中心の変更のため新規テストの追加はない）
- [ ] T020 [US1] [quickstart.md](./quickstart.md) セクション1「その他メニューから言語を切り替える」の手順1〜7を実行し、FR-001〜FR-007 と SC-001 / SC-003 / SC-004 を確認する
- [ ] T021 [US2] [quickstart.md](./quickstart.md) セクション2「サイドパネル全体が選んだ言語で表示される」の手順1〜7を実行し、FR-008〜FR-013 と SC-002 を確認する
- [ ] T022 [US2] [quickstart.md](./quickstart.md) セクション3「状態が失われない」の手順1〜4を実行し、FR-014〜FR-016 と SC-006 を確認する

**Checkpoint**: その他メニューから言語を切り替えられ、サイドパネル全体（ヘッダー・項目登録フォーム・項目カード・タブ・全グループパネル・選択モード・その他メニュー自身）が選んだ言語で表示される。開いているオーバーレイや選択状態・入力値は保たれる

---

## Phase 4: User Story 3 - 項目登録フォームの検証エラーが読める言語で表示される (Priority: P2)

**Goal**: 項目登録フォームの保存時検証エラーが、内部の英語識別文字列ではなく選択中の言語で意味の通る文言になる状態にする

**Independent Test**: 項目名を空のまま、または上限文字数を超えて保存しようとし、表示されるエラーメッセージが選択中の言語で意味の通る文言であることを日本語・英語それぞれで確認する（[quickstart.md](./quickstart.md) セクション4）

### Implementation

- [X] T023 [US3] `src/storage/itemRepository.js` の `NAME_MAX_LENGTH` / `VALUE_MAX_LENGTH` を内部 `const` から `export const` に変更する（`groupRepository.NAME_MAX_LENGTH` と同じ形。[research.md](./research.md) R-007）
- [X] T024 [US3] `src/sidepanel/sidepanel.js` に `itemValidationMessage(error, fallbackKey)` を追加する。`error.field` が `"name"` なら `t("itemForm.errorNameLength", { max: NAME_MAX_LENGTH })`、`"value"` なら `t("itemForm.errorValueLength", { max: VALUE_MAX_LENGTH })`、`"limit"` なら `t("itemForm.errorLimit")`、それ以外・`ValidationError` でない場合は `t(fallbackKey)` を返す（[contracts/language-switch-ui-contract.md](./contracts/language-switch-ui-contract.md) の「4. 項目登録フォームの検証エラー」）
- [X] T025 [US3] `src/sidepanel/sidepanel.js` の項目登録フォーム送信ハンドラの `catch` を、`showItemError(error.message)` / `showItemError("保存に失敗しました。もう一度お試しください。")` から `showItemError(itemValidationMessage(error, "itemForm.errorGeneric"))` に置き換える
- [ ] T026 [US3] [quickstart.md](./quickstart.md) セクション4「項目登録フォームの検証エラー」の手順1〜4を実行し、FR-017 / FR-018 と SC-005 を確認する

**Checkpoint**: 項目登録フォームの検証エラーが常に選択中の言語で意味の通る文言になる

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T027 [P] `README.md` に多言語対応（その他メニューの「言語」セクション、対応言語、既定値）を追記する。あわせて `specs/011-sidepanel-i18n/spec.md` と `quickstart.md` への参照を「詳細な仕様」「動作確認の手順」の各リストに追加する
- [ ] T028 [quickstart.md](./quickstart.md) セクション5「既存機能の回帰確認」の手順1〜7を実行し、テーマ切替・マスク表示・項目とグループの並び替え（ドラッグ・キーボード）・グループの管理操作・タブバーの幅追従表示（英語での文言の長さがタブ幅計算に影響していないか）・フォーカストラップ・選択モードの一括操作に回帰がないことを確認する
- [X] T029 [quickstart.md](./quickstart.md) セクション6に従い `npm test` を実行し、`tests/unit/` の全テスト（新規 `i18n.test.js` を含む）がパスすることを確認する
- [X] T030 `npx reqord impact analyze req-000015` を実行し、影響範囲があれば Reqord の該当要件・仕様の更新PRを提案する（`CLAUDE.md` の開発フロー4）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし
- **Foundational (Phase 2)**: Setup 完了後。**全ユーザーストーリーをブロックする**
- **US1 & US2 (Phase 3)**: Foundational 完了後
- **US3 (Phase 4)**: Foundational 完了後。**US1・US2 の後に実装する**（`itemValidationMessage` は
  `t()` を前提にするが `t()` 自体は Foundational で完成しているため技術的な依存はない。ただし
  項目登録フォームの静的ラベル（`data-i18n-*`。T009）が入る前に検証エラーだけ翻訳すると、
  同じフォーム内で表示の一貫性が崩れる期間が生まれるため、実装順として後に置く）
- **Polish (Phase 5)**: 実装対象のユーザーストーリーがすべて完了後

### User Story Dependencies

- **US1 & US2 (P1 / Phase 3)**: Foundational 完了後に着手可能。他ストーリーへの依存なし。
  **両者は分けてリリースできないため同一フェーズとする**（spec の両ストーリーの
  「Why this priority」を参照）
- **US3 (P2 / Phase 4)**: Foundational 完了後に着手可能。US1・US2 と機能的な依存関係はないが、
  実装順は上記のとおり後に置く

### Within Each Phase

- テストタスク（T002 / T006）は実装前に書き、失敗することを確認する
- 辞書・純関数（`i18n/`）→ ストレージ層（`settingsRepository.js`）→ UI層（`sidepanel.html` /
  `sidepanel.js` / `groupPanel.js`）の順
- 各フェーズの最後に `npm test` と quickstart の該当セクションを実行してから次へ進む

### 同一ファイルを触るため並列にできないタスク

| ファイル | 該当タスク（実行順） |
|---------|-----------|
| `src/i18n/index.js` | T005 のみ |
| `src/storage/settingsRepository.js` | T007 のみ |
| `src/storage/itemRepository.js` | T023 のみ |
| `src/sidepanel/sidepanel.html` | T009 のみ |
| `src/sidepanel/sidepanel.js` | T010 → T011 → T012 → T013 → T014 → T015 → T016 → T024 → T025 |
| `src/sidepanel/groupPanel.js` | T017 → T018 |
| `tests/unit/i18n.test.js` | T002 のみ |
| `tests/unit/settingsRepository.test.js` | T006 のみ |

### Parallel Opportunities

- **Phase 2**: T002（テスト）、T003（`ja.js`）、T004（`en.js`）は互いに独立して着手できる
  （T005 がこの3つの完了を前提にする）。T006（テスト）も上記と独立に着手できる
- **Phase 3**: T009（HTML）は T010〜T018（JS）と並行して進められる
- **Phase 5**: T027（README）は T028〜T030 と並行して進められる

---

## Parallel Example: Foundational

```text
# 以下を並行して進められる:
Task: "tests/unit/i18n.test.js に t() と辞書網羅性のテストを書く（T002）"
Task: "src/i18n/ja.js に日本語辞書58キーを書く（T003）"
Task: "src/i18n/en.js に英語辞書58キーを書く（T004）"
Task: "tests/unit/settingsRepository.test.js に setLanguage のテストを書く（T006）"
```

---

## Implementation Strategy

### MVP First (US1 & US2)

1. Phase 1: Setup（T001）
2. Phase 2: Foundational（T002〜T008）— **全ストーリーをブロックする**
3. Phase 3: US1 & US2（T009〜T022）
4. **停止して検証**: quickstart セクション1〜3 を実行し、その他メニューから言語を切り替えられ、
   画面全体が翻訳され、状態が失われないことを確認する
5. この時点で req-000015 の中心的な価値（多言語対応そのもの）が完成しているため、
   単独でリリース可能

### Incremental Delivery

1. Setup + Foundational → 翻訳基盤が動く
2. US1 & US2 追加（Phase 3）→ 言語切替と画面全体の翻訳網羅（**MVP**）
3. US3 追加（Phase 4）→ 項目登録フォームの検証エラーの是正（既存の不整合修正）
4. Phase 5 → READMEの更新、回帰確認、`reqord impact analyze`

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
- **辞書のキーは [contracts/i18n-contract.md](./contracts/i18n-contract.md) の一覧表に定義された
  58キーのみを使う。**実装中に表にないキーが必要になった場合は、まず契約の表を更新してから使う
- **`moreMenu.languageJa` / `moreMenu.languageEn` の値は `ja.js` と `en.js` で同一**にする
  （言語の選択肢は各言語の自称で固定表示し、表示中の言語によって訳語に変えない。spec FR-002a）
- **`common.unassigned` は `sidepanel.js` と `groupPanel.js` の両方から参照する共有キー**。
  同一エンティティ（未分類グループ）を指すため、領域別キーではなく共有キーにしている
- 英語の件数表現は `count === 1` を単数、それ以外を複数として分岐する（[research.md](./research.md) R-003）
- Chrome Web Store上の拡張機能名・説明文（`manifest.json`）は本specの対象外（spec Assumptions）
