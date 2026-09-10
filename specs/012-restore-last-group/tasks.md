---

description: "Task list for グループ選択状態の復元"
---

# Tasks: グループ選択状態の復元

**Input**: Design documents from `/specs/012-restore-last-group/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: 含める。`technical.yaml` の決定「Unit testを導入する(vitest + chrome API mock)」に従い、
Repository層（`src/storage/settingsRepository.js`）はユニットテスト対象とする。`sidepanel.js` の
`init()` / `selectTab()` のDOM操作は既存specと同方針でユニットテスト対象外とし、
[quickstart.md](./quickstart.md) の手動検証で担保する。

**Organization**: タスクはユーザーストーリー単位でまとめる。本featureは3つのユーザーストーリーが
単一の分岐ロジック（`init()` の選択グループ決定処理）に集約されるため、US2・US3は追加実装を伴わず、
US1で実装した分岐ロジックに対する検証タスクのみとなる（詳細は「Dependencies & Execution Order」参照）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（別ファイル・未完了タスクへの依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US3）
- 説明には対象ファイルのパスを含める

## Path Conventions

単一プロジェクト構成。リポジトリルート直下の `src/` と `tests/` を使う（[plan.md](./plan.md) の
Source Code 構成を参照）。ビルドは行わない。

---

## Phase 1: Setup

**Purpose**: 変更前の状態を確定させ、以降の回帰を検出できるようにする

- [X] T001 `npm test` を実行し、変更前の全テストがパスすることを確認する（ベースライン記録）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全ユーザーストーリーが依存する「選択グループの永続化・読み出し口」を用意する

**⚠️ CRITICAL**: このフェーズが完了するまで、いずれのユーザーストーリーも着手できない

- [X] T002 `tests/unit/settingsRepository.test.js` に `selectedGroupId` のテスト観点を追加する
  （[contracts/selection-restore-contract.md](./contracts/selection-restore-contract.md)）:
  - `get()` の既定値が `selectedGroupId: null` であること
  - `setSelectedGroupId(groupId)` 呼び出し後、`get()` が更新後の値を返すこと
  - `setSelectedGroupId(null)` で `null` に戻せること
  - `setSelectedGroupId` が他フィールド（`maskEnabled` / `theme` / `language`）を変更しないこと

  実装前なので失敗することを確認する
- [X] T003 `src/storage/settingsRepository.js` を変更する:
  - `DEFAULT_SETTINGS` に `selectedGroupId: null` を追加する
  - 新規関数 `setSelectedGroupId(groupId)` を追加する（`setMaskEnabled` と同じ「現在値を読み、
    対象フィールドのみ上書きして書き戻す」パターンに従う。バリデーションは行わない）

  T002 をパスさせる
- [X] T004 `npm test` を実行し、T002〜T003 の追加分と既存テストがすべてパスすることを確認する

**Checkpoint**: 選択グループの保存・読み出し口が揃った。ユーザーストーリーの実装に着手できる

---

## Phase 3: User Story 1 - 最後に選択していたグループの復元 (Priority: P1) 🎯 MVP

**Goal**: サイドパネルを閉じて再度開いたとき、閉じる直前に選択していたグループが選択状態で表示される

**Independent Test**: 先頭以外の任意のグループを選択した状態でサイドパネルを閉じ、再度開いて選択
グループが維持されていることを確認する（[quickstart.md](./quickstart.md) セクション1）

- [X] T005 [US1] `src/sidepanel/sidepanel.js` の `selectTab(groupId)` に
  `await SettingsRepository.setSelectedGroupId(groupId);` を追加する（既存の選択状態更新・再描画処理
  の後、`await renderTabs(); await renderList();` と並列 or 直後のどちらでもよいが、UIの再描画を
  ブロックする追加のローディング状態は導入しない）。`SettingsRepository` の import 文がなければ追加する
- [X] T006 [US1] `src/sidepanel/sidepanel.js` の `init()` を変更する: 現状の
  `selectedTabId = tabOrder[0];` を、`SettingsRepository.get()` で取得した `selectedGroupId` が
  `tabOrder` に含まれていればそれを採用し、含まれなければ `tabOrder[0]` にフォールバックする分岐に
  置き換える（[contracts/selection-restore-contract.md](./contracts/selection-restore-contract.md)
  の手順どおり）
- [ ] T007 [US1] `npm test` を実行し全テストがパスすることを確認したうえで、
  [quickstart.md](./quickstart.md) セクション1・セクション5（初回起動時のフォールバック）を手動検証する

**Checkpoint**: User Story 1 が独立して動作・検証可能な状態

---

## Phase 4: User Story 2 - 並べ替え変更後も選択記憶を優先 (Priority: P2)

**Goal**: グループの並べ替え順を変更した後も、選択していたグループが並べ替え後の先頭グループに
すり替わることなく復元される

**Independent Test**: グループを選択→並べ替え順を変更（選択グループが先頭でなくなる操作）→
サイドパネルを閉じて再度開き、並べ替え後の先頭ではなく選択していたグループが表示されることを確認する
（[quickstart.md](./quickstart.md) セクション2）

**Note**: T006 の分岐ロジックは `tabOrder` 上の位置ではなく `selectedGroupId` の一致で判定するため、
本ストーリーに追加の実装は不要。検証のみを行う

- [ ] T008 [US2] [quickstart.md](./quickstart.md) セクション2の手順に沿って手動検証する
  （グループ並べ替え後もT006の分岐が選択記憶を優先して復元することを確認する）

**Checkpoint**: User Story 2 が独立して検証可能な状態

---

## Phase 5: User Story 3 - 選択グループ削除時のフォールバック (Priority: P3)

**Goal**: 選択していたグループが削除されている場合、エラーにならず先頭グループへフォールバックする

**Independent Test**: グループを選択→そのグループを削除→サイドパネルを閉じて再度開き、先頭グループが
選択状態で表示されエラーが発生しないことを確認する（[quickstart.md](./quickstart.md) セクション3）

**Note**: T006 の分岐ロジックは `tabOrder`（削除済みグループを含まない正規化済み配列）に対する
`includes` 判定のため、本ストーリーに追加の実装は不要。検証のみを行う

- [ ] T009 [US3] [quickstart.md](./quickstart.md) セクション3・セクション4（未分類タブの選択記憶）の
  手順に沿って手動検証する

**Checkpoint**: User Story 3 が独立して検証可能な状態。全ユーザーストーリーが動作する

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全体の最終確認

- [X] T010 `npm test` を実行し、全テスト（Setup時点のベースライン + 本feature追加分）がパスすることを
  最終確認する
- [X] T011 `reqord impact analyze` を実行し、影響範囲があればReqordの該当要件/仕様の更新PRを検討する
  （CLAUDE.md 開発フロー手順4）。実行結果: Direct/Indirect impacts・関連spec・関連Issueいずれも
  「None」。更新PR不要

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)**: ブロッキング。Foundational完了までUser Story着手不可
- **Phase 2** → **Phase 3 (US1)**: T005・T006 は T003（`setSelectedGroupId` の実装）に依存
- **Phase 3 (US1)** → **Phase 4 (US2)** / **Phase 5 (US3)**: US2・US3 は US1 で実装した分岐ロジック
  （T006）自体を検証対象とするため、T006 完了後にのみ着手できる。US2とUS3同士に依存関係はなく、
  どちらを先に検証してもよい
- **Phase 4, 5** → **Phase 6 (Polish)**

```text
Setup (T001)
  → Foundational (T002-T004)
    → US1 (T005-T007) 🎯 MVP
      → US2 (T008)
      → US3 (T009)
        → Polish (T010-T011)
```

## Parallel Execution Examples

- T002（テスト追加）はT001完了後、単独で着手できる。T003（実装）はT002のテストに対して実装するため
  逐次実行（並列不可）
- T008（US2検証）とT009（US3検証）はどちらもT006完了後であれば並列に実施できる（手動検証であり、
  互いの結果に依存しないため）

## Implementation Strategy

**MVP = User Story 1（T001-T007）**: これだけで「先頭固定→最後に選択したグループの復元」という
本要件の中核価値が提供される。US2・US3は追加実装なしの検証タスクであり、US1完了時点で実質的に
全ての成功基準（SC-001〜SC-003）が満たされる設計になっている。段階的にリリースする場合も、
US1完了後にUS2・US3の検証を済ませてから統合するのが自然な区切りとなる。
