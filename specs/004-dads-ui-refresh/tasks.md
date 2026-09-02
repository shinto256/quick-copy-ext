---

description: "Task list for DADS準拠UIデザイン刷新"
---

# Tasks: DADS準拠UIデザイン刷新

**Input**: Design documents from `/specs/004-dads-ui-refresh/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/design-tokens.md](./contracts/design-tokens.md)

**Reqord Requirement**: req-000008 (approved, v1.0)

**Tests**: 含む。spec FR-025 とclarify(2026-09-02)でコントラスト比の自動検査が要求されているため。

**Organization**: ユーザーストーリー単位でフェーズを分ける。ただし本機能は変更がほぼ `src/sidepanel/sidepanel.css` の1ファイルに集中するため、同一ファイルを編集するタスクには `[P]` を付けない。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可(異なるファイル、依存なし)
- **[Story]**: 対応するユーザーストーリー(US1/US2/US3)

## Path Conventions

単一プロジェクト構成。リポジトリルート直下に `src/` と `tests/`。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 書体ファイルの用意。CSSの編集前に完了させる。

- [X] T001 `src/sidepanel/fonts/` を作成し、Noto Sans JP のウェイト軸400〜700に限定した可変サブセット(常用漢字2136字+かな+英数記号)を生成して `src/sidepanel/fonts/NotoSansJP-subset.woff2` に配置する。生成手順は [research.md](./research.md) R9 の生成コマンドに従う(使い捨ての仮想環境で fonttools を用い、生成物のみをコミットする。プロジェクトの依存には追加しない)
- [X] T002 [P] SIL Open Font License 1.1 の全文を `src/sidepanel/fonts/OFL.txt` に配置する
- [X] T003 `src/sidepanel/fonts/NotoSansJP-subset.woff2` のサイズが1MB以下であることを確認する(SC-007)。超える場合は収録範囲を見直す

**Checkpoint**: 書体ファイルが配置され、サイズ基準を満たしている

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: トークン定義。すべてのユーザーストーリーがこれを参照するため、先に完了させる。

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの作業を開始できない

- [X] T004 `src/sidepanel/sidepanel.css` の冒頭に `@font-face` を定義する(font-family: "Noto Sans JP"、src: `fonts/NotoSansJP-subset.woff2` の相対参照、font-weight: 400 700、font-display: swap)。[contracts/design-tokens.md](./contracts/design-tokens.md) 3節の記述をそのまま用いる
- [X] T005 `src/sidepanel/sidepanel.css` の `:root` に、ライトテーマの色トークン14種と `--color-overlay` を定義する。値は [contracts/design-tokens.md](./contracts/design-tokens.md) 1節のライトテーマ表に従う
- [X] T006 `src/sidepanel/sidepanel.css` の `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` と `:root[data-theme="dark"]` の2ブロックに、ダークテーマの色トークンを定義する。値は [contracts/design-tokens.md](./contracts/design-tokens.md) 1節のダークテーマ表に従う。既存の3ブロック構成を維持する
- [X] T007 `src/sidepanel/sidepanel.css` に書体トークン(`--font-family-sans`, `--font-size-*`, `--line-height-*`, `--letter-spacing-*`)を定義する。値は [contracts/design-tokens.md](./contracts/design-tokens.md) 3節に従う
- [X] T008 `src/sidepanel/sidepanel.css` に余白トークン(`--space-1`〜`--space-6`)、角丸トークン(`--radius-focus`, `--radius-control`, `--radius-container`, `--radius-full`)、影トークン(`--elevation-2`, `--elevation-4`, `--elevation-6`)を定義する。値は [contracts/design-tokens.md](./contracts/design-tokens.md) 4節に従う

**Checkpoint**: 全トークンが定義され、ユーザーストーリーの実装を開始できる

---

## Phase 3: User Story 1 - 統一された配色と書体で読みやすく使える (Priority: P1) 🎯 MVP

**Goal**: 全テキストがDADS準拠の配色・書体・文字サイズで表示され、ライト/ダーク両テーマでコントラスト比の基準を満たす。

**Independent Test**: ライト/ダーク両テーマでサイドパネルを開き、全テキストの文字サイズ・行間・コントラスト比を計測する。US2/US3の実装を待たずに検証できる。

### Tests for User Story 1 ⚠️

> **NOTE: T009 を先に書き、失敗することを確認してから T010 以降に進む**

- [X] T009 [P] [US1] `tests/unit/contrastRatio.test.js` を新規作成する。`node:fs` で `src/sidepanel/sidepanel.css` を読み、`:root` ブロックと `:root[data-theme="dark"]` ブロックから `--color-*` の値を抽出し、[contracts/design-tokens.md](./contracts/design-tokens.md) 2節の検査ペア19組に対しWCAG式でコントラスト比を計算する。基準(テキスト4.5:1、非テキスト3:1)を下回るペアがあれば、どのペアが何倍で不足しているかを示して失敗させる。ライト/ダーク両テーマを検証する

### Implementation for User Story 1

- [X] T010 [US1] `src/sidepanel/sidepanel.css` の `body` に `font-family: var(--font-family-sans)`、`font-size: var(--font-size-md)`、`line-height: var(--line-height-body)` を指定する。既存の `font-family: system-ui, "Segoe UI", sans-serif` を置き換える
- [X] T011 [US1] `src/sidepanel/sidepanel.css` のヘッダー領域(`.header`, `.header-row`, `.search-input`, `.mask-toggle`, `.icon-button`)に色・書体トークンを適用する。`.search-input` を16px、`.mask-toggle` を14pxにする
- [X] T012 [US1] `src/sidepanel/sidepanel.css` のメニュー領域(`.more-menu`, `.more-menu-label`, `.more-menu-item`, `.more-menu-divider`)に色・書体トークンを適用する。`.more-menu-label` と `.more-menu-item` を14pxにする。`.more-menu-item.active` の `font-weight: 600` を700に変更する(FR-011: 太さは400と700の2段階のみ)
- [X] T013 [US1] `src/sidepanel/sidepanel.css` のタブ領域(`.tabs`, `.tab-button`, `.tab-add`, `.tab-menu button`, `.tab-menu-button`, `.tab-rename-input`)に色・書体トークンを適用する。`.tab-button`、`.tab-menu button`、`.tab-rename-input` を14pxにする。選択中タブ(`.tab-button.active`)は `--color-accent` と font-weight 700 の両方で区別する。現行の `font-weight: 600` を700に変更する(FR-011)
- [X] T014 [US1] `src/sidepanel/sidepanel.css` の項目カード領域(`.item-card`, `.item-name`, `.item-value`, `.copy-button`, `.kebab-button`, `.item-menu button`, `.drag-handle`)に色・書体トークンを適用する。`.item-name` は16px/700、`.item-value` は16pxかつ行間1.7、`.copy-button` と `.item-menu button` は14pxにする
- [X] T015 [US1] `src/sidepanel/sidepanel.css` の選択ツールバー(`.selection-toolbar`, `.selection-delete-button`, `.selection-cancel-button`, `.item-checkbox`)に色・書体トークンを適用する。14px以上にする
- [X] T016 [US1] `src/sidepanel/sidepanel.css` の状態表示(`.empty-state`, `.copy-status`, `.error`)に色・書体トークンを適用する。すべて14pxにする。成功は `--color-success`、エラーは `--color-error` を用いる
- [X] T017 [US1] `src/sidepanel/sidepanel.css` の登録フォーム(`.form-overlay`, `.item-form`, `.field`, `.field input/textarea/select`, `.actions`, `.actions button`, `#item-save`)に色・書体トークンを適用する。ラベルは14px、入力欄は16pxにする
- [X] T018 [US1] `src/sidepanel/sidepanel.css` の全体を走査し、14px未満のフォントサイズ指定が残っていないことを確認する。[contracts/design-tokens.md](./contracts/design-tokens.md) 5節のコンポーネント対応表と突き合わせる
- [X] T018b [US1] `src/sidepanel/sidepanel.css` の全体を走査し、`font-weight` の指定が400と700以外に存在しないことを確認する(FR-011)
- [X] T019 [US1] `npm test` を実行し、T009 のコントラスト比テストが成功することを確認する。失敗するペアがあれば、DADSプリミティブスケール上の別の段階に色トークンを差し替えて再実行する

**Checkpoint**: 配色と書体が刷新され、コントラスト比テストが通る。US1が単独で検証可能

---

## Phase 4: User Story 2 - キーボードだけで操作でき、現在位置が常に分かる (Priority: P2)

**Goal**: 全インタラクティブ要素にDADS準拠のフォーカス表示が適用され、キーボードのみで全操作に到達できる。

**Independent Test**: Tabキーのみで全インタラクティブ要素を巡回し、各要素でフォーカス表示が視認できることを確認する。

### Implementation for User Story 2

- [X] T020 [US2] `src/sidepanel/sidepanel.css` に `:focus-visible` の共通指定を追加する(outline: 4px solid #000000、outline-offset: 2px、border-radius: var(--radius-focus)、box-shadow: 0 0 0 2px #ffd43d)。テーマによる色の変更は行わない。[contracts/design-tokens.md](./contracts/design-tokens.md) 6節に従う
- [X] T021 [P] [US2] `src/sidepanel/sidepanel.js` のグループタブ生成箇所(`.tab-button` を生成し `.active` クラスを付与している処理)で、選択中のタブに `aria-current="true"` を設定する。非選択タブには付与しない。DOM構造とクラス名は変更しない
- [X] T022 [US2] `src/sidepanel/sidepanel.css` で、フォーカス表示が親要素の `overflow: hidden` や `overflow-x: auto`(`.tabs`)によって見切れないことを確認し、必要なら余白を調整する
- [ ] T023 [US2] ブラウザで [quickstart.md](./quickstart.md) 手順4を実施し、検索欄・チェックボックス・追加ボタン・メニューボタン・各タブ・タブ追加・各項目のドラッグハンドル/コピー/ケバブ・メニュー項目・選択モードの各ボタンすべてにTabキーで到達でき、フォーカス表示が視認できることを確認する。ライト/ダーク両テーマで行う

**Checkpoint**: キーボード操作とフォーカス表示が完成。US1とUS2が独立して動作する

---

## Phase 5: User Story 3 - 余白と階層が整い、情報のまとまりが掴める (Priority: P3)

**Goal**: 余白・角丸・影が一貫したスケールで構成され、重なり合う要素の前後関係が判別できる。

**Independent Test**: 各コンポーネントの余白・角丸・影が定義済みトークンのいずれかの値のみを使っているかを確認する。

### Implementation for User Story 3

- [X] T024 [US3] `src/sidepanel/sidepanel.css` の全 `padding` / `margin` / `gap` の指定を、`var(--space-*)` の参照に置き換える。生の px 値を残さない
- [X] T025 [US3] `src/sidepanel/sidepanel.css` の全 `border-radius` の指定を、`var(--radius-control)`(ボタン・入力欄・メニュー項目)、`var(--radius-container)`(カード・メニュー面・フォーム)、`var(--radius-full)`(タブ)のいずれかに置き換える
- [X] T026 [US3] `src/sidepanel/sidepanel.css` の `box-shadow` を、`.more-menu` に `var(--elevation-2)`、`.item-card.dragging` に `var(--elevation-4)`、`.item-form` に `var(--elevation-6)` を適用する形に置き換える。項目カードの通常状態は影を持たず境界線で表現する
- [X] T027 [US3] `src/sidepanel/sidepanel.css` の境界線指定を見直し、識別に必要な境界(入力欄・ボタン・カード)に `var(--color-border)`、純装飾の区切り線に `var(--color-border-subtle)` を用いるよう整理する。既存の `--color-border-strong` の参照を解消する
- [ ] T028 [US3] ブラウザでサイドパネルの幅を最小まで狭め、要素の重なりと横方向のはみ出しが発生しないこと、文字サイズが14px以上を保つことを確認する([quickstart.md](./quickstart.md) 手順7、SC-006)

**Checkpoint**: 全ユーザーストーリーが独立して動作する

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全体の検証と回帰確認

- [X] T029 `npm test` を実行し、コントラスト比テストと既存5テストがすべて成功することを確認する
- [ ] T030 [P] ブラウザで [quickstart.md](./quickstart.md) 手順3を実施し、14px未満のテキストが存在しないこと、本文の行間が1.5倍以上であることを確認する(SC-002)
- [ ] T031 [P] ブラウザで [quickstart.md](./quickstart.md) 手順6を実施し、書体が適用されていること、収録外文字(髙、﨑など)を含む項目名でも表示が崩れないことを確認する
- [ ] T032 [checklists/regression.md](./checklists/regression.md) の全項目をブラウザで実施し、既存8機能が刷新前と同一に動作することを確認する(SC-004)。目的の項目をコピーするまでの操作回数が変わっていないことを含む(SC-005)
- [X] T033 `src/sidepanel/sidepanel.css` を通読し、未使用になったカスタムプロパティや重複した指定を削除する
- [ ] T034 [checklists/regression.md](./checklists/regression.md) の「結果」欄に実施日・実施者・合否件数を記入する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即座に開始可能
- **Foundational (Phase 2)**: T004 が Phase 1 (T001) の書体ファイル配置に依存。全ユーザーストーリーをブロックする
- **User Stories (Phase 3〜5)**: すべて Phase 2 の完了に依存
  - US1 → US2 → US3 の順に実施することを推奨(下記「ユーザーストーリー間の依存」参照)
- **Polish (Phase 6)**: 実施したいユーザーストーリーの完了に依存

### ユーザーストーリー間の依存

- **US1 (P1)**: Phase 2 完了後に開始可能。他ストーリーへの依存なし
- **US2 (P2)**: Phase 2 完了後に開始可能。ただし**US1の後に実施することを推奨** — フォーカス表示の視認性は配色が確定して初めて正しく検証できる
- **US3 (P3)**: Phase 2 完了後に開始可能。ただし**US1の後に実施することを推奨** — T024〜T027 は US1 で編集する同じセレクタ群に触れるため、順に行う方が編集の衝突がない

### 同一ファイル編集による制約

本機能の変更は `src/sidepanel/sidepanel.css` の1ファイルにほぼ集中する。そのため:

- Phase 2 の T004〜T008、Phase 3 の T010〜T018、Phase 5 の T024〜T027 は**いずれも同一ファイルを編集するため並列実行できない**
- `[P]` を付けたのは、異なるファイルを扱うタスクのみ(T002: OFL.txt、T009: テストファイル、T021: sidepanel.js、T030/T031: 手動確認)

### Parallel Opportunities

- T002(OFL.txt配置)は T001 と並行して実施可能
- T009(テスト作成)は Phase 2 の完了を待たずに着手できる。ただし実行して成功させるには Phase 2 が必要
- T021(sidepanel.js への aria-current 追加)は CSS の編集と並行可能
- T030、T031(手動確認)は互いに独立

---

## Parallel Example: Phase 1 と テスト先行

```bash
# 並行して着手できる組み合わせ
Task: "T002 OFL.txt を src/sidepanel/fonts/ に配置"
Task: "T009 tests/unit/contrastRatio.test.js を作成(この時点では失敗する)"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1 (Setup) を完了 — 書体の配置
2. Phase 2 (Foundational) を完了 — トークン定義 **(全ストーリーをブロック)**
3. Phase 3 (US1) を完了 — 配色と書体の適用
4. **停止して検証**: `npm test` でコントラスト比テストが通り、ライト/ダーク両テーマで読めることを確認
5. この時点で「DADS準拠の配色・書体で読みやすい」という価値が独立して届く

### Incremental Delivery

1. Setup + Foundational → 土台完成
2. US1 追加 → 単独検証 → **MVP**
3. US2 追加 → 単独検証 → キーボード操作とアクセシビリティが完成
4. US3 追加 → 単独検証 → 余白と階層が整う
5. Phase 6 → 全体の回帰確認

各ストーリーは前のストーリーを壊さずに価値を追加する。

---

## Notes

- `[P]` = 異なるファイル、依存なし
- `[Story]` ラベルはユーザーストーリーへの追跡用
- T009 のテストは実装前に書き、失敗することを確認する
- タスクごと、または論理的なまとまりごとにコミットする
- 各 Checkpoint で停止してストーリー単位の検証ができる
- **実装中に仕様からの逸脱が生じた場合は即座に停止し**、憲法の Reqord運用ルールに従って `feedback` ラベル付きの GitHub Issue を作成する(`/speckit.taskstoissues` は使用しない)
- 既存の DOM構造・クラス名・イベントハンドリングは変更しない。JS への変更は T021 の `aria-current` 付与のみ
