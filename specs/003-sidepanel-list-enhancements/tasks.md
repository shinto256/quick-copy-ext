---

description: "Task list template for feature implementation"
---

# Tasks: サイドパネル一覧機能拡張(並び替え・テーマ手動切替・一括削除)

**Input**: Design documents from `/specs/003-sidepanel-list-enhancements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: `itemRepository`/`settingsRepository`への追加関数はcontracts/でユニットテスト対象と
定義済みのため含める。DOM組み立て自体(`sidepanel.js`)は001・002の方針を踏襲しユニットテスト
対象外(quickstart.mdの手動検証で担保)。

**Organization**: タスクはspec.mdのUser Story（優先度順: P1→P2→P3）ごとにグループ化。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（別ファイル・依存なし）
- **[Story]**: 対応するUser Story（US1〜US3、spec.mdの番号に対応）
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

**Purpose**: テーマ設定(US2)と選択モード開始(US3)の両方から使う、ヘッダー「その他メニュー」の
土台を用意する

**⚠️ CRITICAL**: このフェーズ完了までUS2・US3の実装に着手しない（US1はこのメニューに依存しない
ため並行着手可）

- [ ] T001 [P] `src/sidepanel/sidepanel.html` にヘッダー「その他メニュー」の骨格(縦三点(⋮)の
      トグルボタン+中身が空のドロップダウンコンテナ)を追加する(contracts/sidepanel-ui-additions-contract.md準拠)
- [ ] T002 [P] `src/sidepanel/sidepanel.css` に「その他メニュー」ドロップダウンの基本スタイル
      (開閉表示、項目の並び)を追加する
- [ ] T003 `src/sidepanel/sidepanel.js` に「その他メニュー」の開閉ロジックを実装する: トグル
      ボタン押下でドロップダウンの表示/非表示を切り替え、既存のタブ/カードケバブメニューと同様に
      外側クリックで閉じるようにする(既存の`document`クリックリスナーのパターンを踏襲)

**Checkpoint**: ヘッダーの「その他メニュー」ボタンで空のドロップダウンが開閉できる状態

---

## Phase 3: User Story 1 - 項目の並び順を自分で決める (Priority: P1) 🎯 MVP

**Goal**: 選択中タブ内で、ドラッグ&ドロップまたはケバブメニューの上下移動により項目の表示順を
変更でき、その順序が永続化される

**Independent Test**: 同一タブ内の複数項目をドラッグまたは上下移動で並び替え、パネルを閉じて
再度開いても順序が維持されることを確認する。検索絞り込み中は並び替えができないことも確認する

### Implementation for User Story 1

- [ ] T004 [US1] `src/storage/itemRepository.js` に `reorderGroup(groupId, orderedIds)` を
      実装する(contracts/item-repository-additions.md準拠。対象グループの項目ID集合と
      `orderedIds`が完全一致しない場合は`ValidationError`)
- [ ] T005 [P] [US1] `tests/unit/itemRepository.test.js` に `reorderGroup` のテストを追加する
      (順序反転、他グループ非干渉、不整合時のValidationError)
- [ ] T006 [P] [US1] `src/sidepanel/sidepanel.css` にドラッグ中のカードの見た目(カーソル、
      ドラッグ中/ドロップ先の強調表示)を追加する
- [ ] T007 [US1] `src/sidepanel/sidepanel.js` の`createItemCard`を更新し、検索キーワードが空の
      場合のみ各カードに`draggable="true"`を付与し、`dragstart`/`dragover`/`drop`イベントで
      ドロップ位置に応じた新しい並び順を組み立て、`ItemRepository.reorderGroup()`を呼び出して
      `renderList()`を再実行する
- [ ] T008 [US1] 各カードのケバブメニューに「上へ移動」「下へ移動」を追加する(検索キーワードが
      空の場合のみ表示)。選択すると対象項目と隣接項目を入れ替えた順序で`reorderGroup()`を呼び出す
- [ ] T009 [US1] T007・T008を検索キーワード入力時に無効化する(`draggable`属性を外し、上下移動
      メニュー項目を非表示にする)処理を実装する(FR-004準拠。新規登録項目が末尾に追加される挙動は
      既存の`ItemRepository.create()`の配列末尾追加でFR-005a要件を満たすため追加実装不要、
      quickstart.mdの手動検証で確認する)

**Checkpoint**: User Story 1が単独で動作・検証可能(並び替え・永続化・検索中無効化)

---

## Phase 4: User Story 3 - 不要な項目をまとめて削除する (Priority: P2)

**Goal**: 選択モードで複数項目を選択し、確認の上まとめて削除できる。何も削除せず選択モードを
終了する操作もある

**Independent Test**: 選択モードに入り複数項目を選択して一括削除すると、選択項目のみが削除され
未選択項目は残ることを確認する。キャンセル操作・タブ切替・検索実行で選択状態がリセットされる
ことも確認する

### Implementation for User Story 3

- [ ] T010 [US3] `src/storage/itemRepository.js` に `removeMany(ids)` を実装する
      (contracts/item-repository-additions.md準拠。存在しないIDは無視、1回の書き込みで永続化)
- [ ] T011 [P] [US3] `tests/unit/itemRepository.test.js` に `removeMany` のテストを追加する
      (複数削除、存在しないID混在、空配列)
- [ ] T012 [US3] `src/sidepanel/sidepanel.html`/`sidepanel.css` に選択モード用UI要素を追加する:
      各カードのチェックボックス用スロット(非選択モード時は非表示)、選択件数・削除・キャンセルを
      表示する選択モード用ツールバー
- [ ] T013 [US3] 「その他メニュー」に「選択」項目を追加し、選択すると選択モード(`selectionMode`)を
      開始するよう`sidepanel.js`に実装する
- [ ] T014 [US3] 選択モード中の一覧描画を実装する: 各カードにチェックボックスを表示し、
      チェック操作で`selectedItemIds`を更新、選択件数をツールバーに反映する
- [ ] T015 [US3] 削除操作を実装する: 選択件数が1件以上のときのみ「削除」を有効化し、確認
      ダイアログ承認後 `ItemRepository.removeMany()` を呼び出し、`renderList()`を再実行して
      選択モードを終了する
- [ ] T016 [US3] 「キャンセル」操作を実装する: 削除を行わず`selectedItemIds`をクリアし、
      選択モードを終了して通常表示に戻す(FR-013a準拠)
- [ ] T017 [US3] 既存のタブ切替ハンドラ・検索入力ハンドラを更新し、選択モード中にタブ切替または
      検索キーワード入力が発生した場合、選択モードを終了し選択状態をリセットするようにする
      (FR-013準拠)

**Checkpoint**: User Story 1・3が単独・組み合わせともに動作可能

---

## Phase 5: User Story 2 - テーマをライト/ダークに固定する (Priority: P3)

**Goal**: 「その他メニュー」からテーマを自動/ライト固定/ダーク固定に設定でき、固定時はOS側の
設定変更の影響を受けない。設定は永続化される

**Independent Test**: テーマを「ライト固定」に設定した状態でOS側をダークに変更してもパネルの
表示がライトのままであること、パネルを閉じて再度開いても設定が維持されることを確認する

### Implementation for User Story 2

- [ ] T018 [US2] `src/storage/settingsRepository.js` の`DEFAULT_SETTINGS`に`theme: "auto"`を
      追加し、`setTheme(theme)`を実装する(contracts/settings-repository-additions.md準拠。
      `"auto"|"light"|"dark"`以外は`ValidationError`)
- [ ] T019 [P] [US2] `tests/unit/settingsRepository.test.js` に `setTheme` のテストを追加する
      (更新後の`get()`反映、未設定時のデフォルト`"auto"`、不正値のValidationError)
- [ ] T020 [P] [US2] `src/sidepanel/sidepanel.css` に手動テーマ固定用のCSSを追加する:
      `:root[data-theme="dark"]`で強制ダーク、`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {...} }`
      でライト固定時のシステム連動ダーク化を無効化する
- [ ] T021 [US2] 「その他メニュー」にテーマ設定項目(自動/ライト/ダークの3択、現在値が分かる表示)を
      追加する
- [ ] T022 [US2] テーマ選択時の処理を実装する: `SettingsRepository.setTheme()`を呼び出し、
      `document.documentElement.dataset.theme`に`"light"`/`"dark"`をセット(`"auto"`選択時は
      属性を削除)してメニューを閉じる
- [ ] T023 [US2] パネル初期化時に`SettingsRepository.get()`の`theme`を読み、初回描画前に
      `data-theme`属性を反映する(表示切替のちらつき防止)

**Checkpoint**: 全User Story(US1〜US3)が独立・組み合わせともに動作可能

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全体の回帰確認とドキュメント更新

- [ ] T024 `npm run test` を実行し、既存テスト+新規テスト(reorderGroup/removeMany/setTheme)が
      すべてパスすることを確認する
- [ ] T025 `quickstart.md` の手順(1〜3)に沿って手動検証を行い、全項目を確認する
- [ ] T026 [P] `README.md` に並び替え・テーマ手動固定・一括削除の機能概要を追記する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 作業なし
- **Foundational (Phase 2)**: US2・US3の前提(US1はこのフェーズに依存しない)
- **User Stories (Phase 3〜5)**: US1はFoundational完了を待たずに着手可能。US2・US3はFoundational
  (「その他メニュー」の骨格)完了後に着手
- **Polish (Phase 6)**: 実施対象のUser Story完了後

### User Story Dependencies

- **US1 (P1)**: 依存なし。Foundationalと並行着手可能
- **US3 (P2)**: Foundational(「その他メニュー」骨格)完了が前提
- **US2 (P3)**: Foundational(「その他メニュー」骨格)完了が前提。US3と共存する形で「その他メニュー」
  に項目を追加するため、実装順が前後しても互いのタスクを壊さないよう、メニュー項目のDOM追加は
  各Story内で完結させる(T013の「選択」項目とT021のテーマ項目は独立したDOM追加)

### Within Each User Story

- Repository層の関数実装・テストが先、UIロジックが後
- Story内の実装完了後、Checkpointで独立動作を確認してから次のStoryへ

### Parallel Opportunities

- Foundational内 T001 / T002 は並行可能(異なるファイル)
- US1(Phase 3)は Foundational と並行して着手可能(担当者が異なる場合)
- 各StoryのRepository層テスト追加(T005, T011, T019)はそれぞれ[P]で他タスクと並行可能
- Polish内 T026(README更新)は他タスクと並行可能

---

## Parallel Example: Foundational + User Story 1

```bash
# Foundational
Task: "src/sidepanel/sidepanel.html にその他メニューの骨格を追加する"
Task: "src/sidepanel/sidepanel.css にドロップダウンの基本スタイルを追加する"

# User Story 1(Foundationalと並行可能)
Task: "src/storage/itemRepository.js に reorderGroup を実装する"
Task: "tests/unit/itemRepository.test.js に reorderGroup のテストを追加する"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 2: Foundational 完了(US2/US3着手に必要。US1のみなら省略可)
2. Phase 3: User Story 1 完了
3. **STOP and VALIDATE**: 並び替え・永続化・検索中無効化を単独検証
4. 必要ならここでデモ・レビュー

### Incremental Delivery

1. Foundational → その他メニューの土台完成
2. US1追加 → 並び替えを検証(MVP、Foundationalと並行実装可)
3. US3追加 → 一括削除を検証
4. US2追加 → テーマ手動固定を検証
5. Polish → 全体回帰テスト・ドキュメント更新

## Notes

- [P]タスク = 異なるファイル・依存なし
- [Story]ラベルはUser Storyへのトレーサビリティ用(spec.mdの番号=US1/US2/US3に対応。実装順は
  優先度順のためPhase番号とUS番号が一致しない箇所がある)
- 各Storyは独立して完結・検証可能
- Story完了ごとにcheckpointで独立動作を確認してから次へ進む
