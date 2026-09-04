---

description: "Task list for グループナビゲーション改善（全グループパネル・並び替え・名称長制御）"
---

# Tasks: グループナビゲーション改善（全グループパネル・並び替え・名称長制御）

**Input**: Design documents from `/specs/006-group-navigation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: 含める。`technical.yaml` の決定「Unit testを導入する(vitest + chrome API mock)」に従い、
純関数（`src/storage/tabOrder.js`）と Repository層（`src/storage/groupRepository.js`）はユニットテスト
対象とする。`dragReorder.js` / `groupPanel.js` のDOM操作は既存specと同方針でユニットテスト対象外とし、
[quickstart.md](./quickstart.md) の手動検証で担保する。

**Organization**: タスクはユーザーストーリー単位でまとめ、各ストーリーが独立して実装・検証できるようにする。

**フェーズ順について**: spec の優先度は P1 → P2 → P3 → P4 だが、**US3（P3）の入力欄側タスクが
US4（P4）のインライン編集に依存する**ため、フェーズは US1 → US2 → **US4** → **US3** の順に並べている。
タスクIDはこの実行順の連番。優先度とフェーズ順が一致しない理由は「Dependencies & Execution Order」を参照。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（別ファイル・未完了タスクへの依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US4）
- 説明には対象ファイルのパスを含める

## Path Conventions

単一プロジェクト構成。リポジトリルート直下の `src/` と `tests/` を使う（[plan.md](./plan.md) の
Source Code 構成を参照）。ビルドは行わない。

---

## Phase 1: Setup

**Purpose**: 変更前の状態を確定させ、以降の回帰を検出できるようにする

- [X] T001 `npm test` を実行し、変更前の全テストがパスすることを確認する（ベースライン記録。`tests/unit/` 配下6ファイル）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全ユーザーストーリーが依存する並び順の情報源とその読み出し口を用意する

**⚠️ CRITICAL**: このフェーズが完了するまで、いずれのユーザーストーリーも着手できない

- [X] T002 [P] `tests/unit/tabOrder.test.js` を新規作成し、`normalizeTabOrder` の13件と `isValidTabOrder` の7件のテスト観点（[contracts/tab-order-contract.md](./contracts/tab-order-contract.md)）を書く。実装前なので失敗することを確認する
- [X] T003 `src/storage/tabOrder.js` を新規作成し、`UNASSIGNED_TAB_ID` / `normalizeTabOrder(storedOrder, groups)` / `isValidTabOrder(candidate, normalizedOrder)` を実装して T002 をパスさせる（正規化4ルールの適用順は [contracts/tab-order-contract.md](./contracts/tab-order-contract.md) のとおり。非破壊であること）
- [X] T004 `src/sidepanel/itemFilter.js` の `UNASSIGNED_TAB_ID` 定義を `export { UNASSIGNED_TAB_ID } from "../storage/tabOrder.js";` の再エクスポートに置き換える。`filterItemsByTabAndSearch` 内の参照と既存の import 経路（`src/sidepanel/sidepanel.js:6`、`tests/unit/itemFilter.test.js:2`）は変更しない
- [X] T005 `tests/unit/groupRepository.test.js` に `listTabOrder()` のテスト観点6件（[contracts/group-repository-additions.md](./contracts/group-repository-additions.md)）を追加する。実装前なので失敗することを確認する
- [X] T006 `src/storage/groupRepository.js` に `const ORDER_KEY = "tabOrder";` と `listTabOrder()` を追加して T005 をパスさせる。`tabOrder` を読んで `normalizeTabOrder` の結果を返すだけで、書き込みは行わない
- [X] T007 `npm test` を実行し、T002〜T006 の追加分と既存テストがすべてパスすることを確認する（`tests/unit/itemFilter.test.js` が再エクスポート後も import 経路を変えずにパスすること）

**Checkpoint**: 並び順の読み出しと正規化が揃った。ユーザーストーリーの実装に着手できる

---

## Phase 3: User Story 1 - 全グループを一覧して目的のグループへ切り替える (Priority: P1) 🎯 MVP

**Goal**: タブバー末尾のボタンから全グループパネルを開き、絞り込みで目的のグループを見つけて切り替えられる状態にする

**Independent Test**: グループを20個以上登録した状態でタブバー末尾のボタンを押し、未分類を含む全タブが縦リストで一覧されること、絞り込み入力に名前の一部を入力して対象が絞られること、リストの行から目的のグループへ切り替えられることを確認する（[quickstart.md](./quickstart.md) セクション1）

### Implementation for User Story 1

- [X] T008 [US1] `src/sidepanel/sidepanel.html` に全グループパネルのDOMを追加する（`#group-panel-overlay` / `#group-panel` / `#group-panel-filter` / `#group-panel-close` / `#group-panel-list` / `#group-panel-empty` / `#group-panel-add` / `#group-panel-error`。構造は [contracts/group-panel-ui-contract.md](./contracts/group-panel-ui-contract.md) の「DOM 構造」に従う。`#group-panel-overlay` は `hidden` 属性で閉じた状態にしておく。**`#group-panel-add` にも `hidden` を付けておく** — ハンドラは US4 の T031 で実装するため、US1 を単独でリリースしても無反応のボタンが露出しないようにする）
- [X] T009 [P] [US1] `src/sidepanel/sidepanel.css` にパネルのスタイルを追加する（オーバーレイは既存 `.form-overlay`（`sidepanel.css:627`）と同じ `position: fixed; inset: 0`。パネル本体は既存 `.item-form` の `max-width: 360px` を適用せずオーバーレイいっぱいに広げる。`#group-panel-list` に `overflow-y: auto`。`.group-row` は**高さ固定**・`touch-action: none`・名前は1行で末尾省略。既存 `.item-form` のスタイルは変更しない）
- [X] T010 [US1] `src/sidepanel/groupPanel.js` を新規作成し、`initGroupPanel(callbacks)` が `{ open, close, isOpen }` を返す骨格と縦リストの描画を実装する（`GroupRepository.listTabOrder()` の順に行を生成、`data-tab-id` を付与、`ItemRepository.list()` を1回呼んで `groupId` ごとの件数を数えて表示、選択中タブの行に選択中スタイルを当てる。**未分類行も他の行と同じ `.group-row` クラス・同じ高さで描画する** — US2 で並び替え対象になる（FR-010）ため、`rowSelector` に一致し行高も揃っている必要がある。未分類は名前を「未分類」とし、三点リーダーだけ描画しない）
- [X] T011 [US1] `src/sidepanel/groupPanel.js` に絞り込みを実装する（`#group-panel-filter` の入力ごとに再描画。判定は `name.toLowerCase().includes(term.toLowerCase())`。未分類も「未分類」という名前で対象にする。結果0件のとき `#group-panel-list` を空にして `#group-panel-empty` を表示する）
- [X] T012 [US1] `src/sidepanel/groupPanel.js` にパネルの開閉を実装する（`open()` で絞り込み入力へフォーカスし、選択中タブの行が表示範囲に入る位置まで `#group-panel-list` をスクロールする。`#group-panel-close` と `Escape` キーで閉じる。閉じるときは経路にかかわらず絞り込み文字列・行メニューの開閉・インライン編集の状態をクリアする）
- [X] T013 [US1] `src/sidepanel/groupPanel.js` に行のタップによるグループ切替を実装する（`onSelectTab(tabId)` を呼んでパネルを閉じる）。**この時点では `#group-panel-list` の `click` イベントで実装し、T020 で `dragReorder` の `onActivate` に差し替える**（US1 を単独で動く状態にするための暫定実装）
- [X] T014 [US1] `src/sidepanel/sidepanel.js` の `renderTabs` にタブバー末尾のパネルを開くボタンを追加する（ラベルに `listTabOrder().length`（未分類を含む総数）を併記。選択モード中（`selectionMode === true`）は `disabled`）。あわせて `initGroupPanel({ getSelectedTabId, isSelectionMode, onSelectTab: selectTab, onTabsChanged: renderTabs, onItemsChanged: renderList })` の呼び出しを追加し、ボタン押下で `open()` を呼ぶ
- [X] T015 [P] [US1] `src/sidepanel/sidepanel.css` にパネルを開くボタンのスタイルを追加する（タブバーの横スクロールに追従せず常に見える位置に固定するため `position: sticky; right: 0` 相当。既存 `.tabs` の `overflow-x: auto` は維持する）
- [ ] T016 [US1] [quickstart.md](./quickstart.md) セクション1「全グループパネルで探す」の手順1〜14を実行し、FR-001 / FR-002 / FR-002a / FR-003 / FR-004 / FR-005 / FR-006 / FR-007 / FR-008 / FR-008a / FR-008b と SC-001 / SC-007 / SC-008 を確認する

**Checkpoint**: パネルで一覧・絞り込み・切替ができる。並び替えなしでも「探せない」課題は解消している

---

## Phase 4: User Story 2 - よく使うグループを先頭に並べ替える (Priority: P2)

**Goal**: パネルの縦リストでドラッグして並び替え、その順序がタブ順と起動時の選択タブに反映される状態にする

**Independent Test**: 縦リストで最下部のグループをドラッグして先頭へ移動し、タブバーの表示順が追従すること、拡張機能を閉じて開き直しても順序が保持され先頭のタブが選択された状態で開くことを確認する（[quickstart.md](./quickstart.md) セクション2）

### Tests for User Story 2

- [X] T017 [US2] `tests/unit/groupRepository.test.js` に `reorderTabs()` のテスト観点8件（[contracts/group-repository-additions.md](./contracts/group-repository-additions.md)）を追加する。実装前なので失敗することを確認する

### Implementation for User Story 2

- [X] T018 [US2] `src/storage/groupRepository.js` に `reorderTabs(orderedTabIds)` を追加して T017 をパスさせる（`listTabOrder()` で現在の並び順を取り、`isValidTabOrder` で検証。不一致なら `ValidationError("orderedTabIds", ...)` を投げて保存しない。妥当なら `setItem(ORDER_KEY, [...orderedTabIds])` の1回の書き込みで保存する）
- [X] T019 [US2] `src/sidepanel/dragReorder.js` を新規作成し、`attachDragReorder(container, options)` を実装する（Pointer Events + `setPointerCapture`、閾値既定5px、ドラッグ開始時に先頭行の高さを1回計測、挿入位置は `Math.round(移動量 / 行高)` で算出、兄弟行の退避、ドロップ時の吸着後にDOM確定、`container` 端30px以内で `requestAnimationFrame` による自動スクロール、`pointercancel` で元の順序へ復帰、解除関数を返す。詳細は [contracts/drag-reorder-contract.md](./contracts/drag-reorder-contract.md)）
- [X] T020 [US2] `src/sidepanel/groupPanel.js` で `attachDragReorder` を配線する（`rowSelector: ".group-row"` / `ignoreSelector: ".group-row-menu-button"` / `threshold: 5` / `canDrag: () => 絞り込みが空` / `onActivate` で T013 の `click` 実装を置き換え / `onReorder` で `data-tab-id` を集めて `GroupRepository.reorderTabs()` を呼び、成功したら `onTabsChanged()` でタブバーを再描画する）
- [X] T021 [P] [US2] `src/sidepanel/sidepanel.css` にドラッグ中のスタイルを追加する（ドラッグ中の行に `z-index` と影、退避に `transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)`、吸着に `180ms` の同イージング。値は [research.md](./research.md) の R-004 のとおり）
- [X] T022 [US2] `src/sidepanel/groupPanel.js` の `onReorder` にエラー処理を追加する（例外発生時に `#group-panel-error` へメッセージを表示し、`listTabOrder()` から縦リストを再描画して保存済みの順序に戻す）
- [X] T023 [US2] `src/sidepanel/sidepanel.js` の `renderTabs` を `GroupRepository.listTabOrder()` の順序で描画するよう書き換える（未分類を先頭に固定する `createTabElement(UNASSIGNED_TAB_ID, ...)` の呼び出しと `groups` 配列順のループを撤去し、`tabOrder` の各要素を未分類かグループかで判別して描画する）
- [X] T024 [US2] `src/sidepanel/sidepanel.js` の `init()` の初期選択タブを `groups.length > 0 ? groups[0].id : UNASSIGNED_TAB_ID` から `listTabOrder()` の先頭要素に変更する（**既定の並び順では未分類が先頭になるため、起動時に開くタブが「最初のグループ」から「未分類」に変わる。これは FR-013 と正規化ルール3の帰結であり意図した変更。spec.md の Assumptions に記載済み。利用者は並び替えで先頭を変えられる**）
- [X] T025 [US2] `src/sidepanel/groupPanel.js` と `src/sidepanel/sidepanel.css` で、絞り込み文字列が空でない間は行の掴み手アイコン（`.group-row-handle`）を非表示にし、並び替えができないことを示す
- [X] T026 [US2] `npm test` を実行し、`tests/unit/groupRepository.test.js` の追加分（T017）と `tests/unit/` の既存テストがすべてパスすることを確認する
- [ ] T027 [US2] [quickstart.md](./quickstart.md) セクション2「ドラッグで並び替える」の手順1〜13を実行し、FR-009 / FR-009a / FR-009b / FR-010 / FR-011 / FR-012 / FR-013 / FR-014 / FR-015 / FR-016 / FR-017 / FR-018 と SC-002 / SC-003 / SC-006 / SC-009 を確認する

**Checkpoint**: 並び替えが動き、タブ順と起動時の選択タブに反映される。US1 と US2 が独立して動作する

---

## Phase 5: User Story 4 - グループの管理操作をパネルに集約する (Priority: P4)

**Goal**: 名称変更・削除・追加をパネルに集め、タブバーを切替専用にする

**Independent Test**: パネルの各行から名称変更と削除が行えること、未分類の行には管理操作が現れないこと、タブ内に三点リーダーが表示されないことを確認する（[quickstart.md](./quickstart.md) セクション4）

**フェーズ順の理由**: 優先度は P4 だが、US3（P3）の入力欄側タスク（T044 / T045）が本フェーズの
インライン編集（T029 / T030）で作る入力欄に手を入れるため、US3 より先に実装する。US3 を先にすると
`maxlength` と文字数表示を撤去予定のタブ内インライン入力（`tab-rename-input`）に一度実装することになり、
本フェーズで作り直しになる。

### Tests for User Story 4

- [X] T028 [US4] `tests/unit/groupRepository.test.js` に `remove()` が `tabOrder` から該当IDを除去することのテスト観点5件（[contracts/group-repository-additions.md](./contracts/group-repository-additions.md)）と、`create()` が `tabOrder` に書き込まず新規グループが `listTabOrder()` の末尾に現れることのテストを追加する。実装前なので失敗することを確認する

### Implementation for User Story 4

- [X] T029 [US4] `src/sidepanel/groupPanel.js` に行の三点リーダー（`.group-row-menu-button`）とメニュー（「名称を変更」「削除」）を実装する。未分類の行では三点リーダーを描画しない
- [X] T030 [US4] `src/sidepanel/groupPanel.js` に名称変更のインライン編集を実装する（行を入力欄に差し替え、現在の名前を初期値にして自動フォーカス＋全選択。`Enter` で `GroupRepository.rename(id, value)`、成功したら行の表示に戻して `onTabsChanged()`。`Escape` で変更せず戻す。`ValidationError` は `#group-panel-error` に表示して入力欄は開いたままにする。`Escape` はパネルを閉じずに編集の取消を優先する）
- [X] T031 [US4] `src/sidepanel/groupPanel.js` にグループ追加を実装する（**`#group-panel-add` の `hidden` を解除し**、押すと縦リストの末尾に入力用の行を挿入して自動フォーカス。`Enter` で `GroupRepository.create(value)`、成功したら入力行を取り除いて縦リストとタブバーを再描画。`Escape` で入力行を取り除く。上限50件の `ValidationError` は `#group-panel-error` に表示する）
- [X] T032 [US4] `src/sidepanel/groupPanel.js` に削除を実装する（確認ダイアログの文面に所属項目の件数を含める。`GroupRepository.remove(id)` を呼び、削除したグループが選択中だった場合は削除後の `listTabOrder()[0]` を `onSelectTab` で選択する。縦リスト・タブバー・項目一覧（`onItemsChanged()`）を再描画する）
- [X] T033 [US4] `src/storage/groupRepository.js` の `remove(id)` に、`tabOrder` から該当IDを除去して保存する処理を追加して T028 をパスさせる（既存の `removeByGroup` と `groups` の更新は変更しない）
- [X] T034 [US4] `src/sidepanel/groupPanel.js` の `canDrag` に「行がインライン編集中、または新規追加の入力行が表示中でない」条件を追加する（T020 で設定した絞り込みの条件と併せて判定する）
- [X] T035 [US4] `src/sidepanel/sidepanel.js` からタブ内の管理操作を撤去する（`tab-menu-button` / `tab-menu` / `tab-rename-input` の生成、`createGroupInlineInput`、`tab-add` ボタン、状態変数 `openTabMenuGroupId` / `renamingGroupId` / `creatingGroup`、`document` クリックハンドラ内の `.tab-wrapper` 判定。`submitCreateGroup` / `submitRenameGroup` / `deleteGroup` は T030〜T032 へ移したうえで削除する）
- [X] T036 [P] [US4] `src/sidepanel/sidepanel.css` から `.tab-menu` / `.tab-menu-button` / `.tab-rename-input` / `.tab-add` および `.tab-add:hover` / `.tab-menu-button:hover` のスタイルを削除する
- [X] T037 [P] [US4] `src/sidepanel/sidepanel.css` に行の三点リーダー・行メニュー・インライン入力欄・文字数表示のスタイルを追加する（入力欄が入っても `.group-row` の高さが変わらないようにする。`dragReorder` の行高固定の前提を崩さない）
- [X] T038 [US4] `npm test` を実行し、`tests/unit/groupRepository.test.js` の追加分（T028）と `tests/unit/` の既存テストがすべてパスすることを確認する
- [ ] T039 [US4] [quickstart.md](./quickstart.md) セクション4「管理操作のパネル集約」の手順1〜13を実行し、FR-019 / FR-025 / FR-025a / FR-026 / FR-027 / FR-028 / FR-029 / FR-030 と SC-005 を確認する

**Checkpoint**: 管理操作がパネルに集まり、タブバーが切替専用になった

---

## Phase 6: User Story 3 - グループ名の長さを抑えて一覧性を保つ (Priority: P3)

**Goal**: グループ名の上限を20文字にし、入力欄で打ち止めにして、長い名前でも表示が破綻しない状態にする

**Independent Test**: グループ名の入力欄で21文字以上を入力できないこと、入力中に現在の文字数と上限が表示されること、既存の20文字を超える名前が切り詰められずに末尾省略で表示されることを確認する（[quickstart.md](./quickstart.md) セクション3）

### Tests for User Story 3

- [X] T040 [US3] `tests/unit/groupRepository.test.js` に `NAME_MAX_LENGTH` が20であることの境界テストを追加する（`create` で21文字が `ValidationError`・20文字が成功、`rename` で21文字が `ValidationError`・20文字が成功、既に25文字で保存されているグループの `rename` に21文字を指定すると `ValidationError`。[contracts/group-repository-additions.md](./contracts/group-repository-additions.md) 参照）。実装前なので失敗することを確認する

### Implementation for User Story 3

- [X] T041 [US3] `src/storage/groupRepository.js` の `NAME_MAX_LENGTH` を30から20に変更して T040 をパスさせる（`validateName` は既存のまま `create` / `rename` の入力にのみ適用し、既に保存されている名前の検証・切り詰めは行わない）
- [X] T042 [P] [US3] `src/sidepanel/sidepanel.css` の `.tab-button` に `max-width` と `text-overflow: ellipsis` を追加する（既存の `white-space: nowrap` は維持する）
- [X] T043 [US3] `src/sidepanel/sidepanel.js` の `renderTabs` で、各タブに `title` 属性としてグループ名の全文を設定する
- [X] T044 [US3] `src/sidepanel/groupPanel.js` のインライン入力欄（T030 の名称変更、T031 の新規追加）に `maxlength` を設定する。値は `groupRepository` から `NAME_MAX_LENGTH` を import して使い、HTML属性に直書きしない
- [X] T045 [US3] `src/sidepanel/groupPanel.js` のインライン入力欄と**同じ行**に文字数表示（`<現在の文字数> / <上限>` 形式）を追加し、入力のたびに更新する。上限値は T044 と同じ `NAME_MAX_LENGTH` の import から取り、リテラルの `20` を書かない
- [X] T046 [US3] `npm test` を実行し、`tests/unit/groupRepository.test.js` の境界テスト（T040）と `tests/unit/` の既存テストがすべてパスすることを確認する
- [ ] T047 [US3] [quickstart.md](./quickstart.md) セクション3「グループ名の文字数」の手順1〜9を実行し、FR-020 / FR-021 / FR-022 / FR-023 / FR-024 と SC-004 / SC-008 を確認する

**Checkpoint**: 4つのユーザーストーリーがすべて独立して動作する

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T048 [P] `README.md` の「機能」節から未実装の「項目のドラッグ&ドロップ」の記述を削除して実態（上下移動による並び替え）に合わせ、本機能（全グループパネルによる一覧・絞り込み、グループのドラッグ並び替え、グループ名20文字上限）を追記する。起動時に開くタブが「並び順の先頭」になった点にも触れる。あわせて `specs/006-group-navigation/spec.md` と `quickstart.md` への参照を「詳細な仕様」「動作確認の手順」の各リストに追加する
- [X] T049 [P] `src/sidepanel/sidepanel.js` の未使用になった import・変数・関数を削除し、行数を確認する（パネルとドラッグ機構を分離した結果、変更前の778行から減っていること）
- [ ] T050 [quickstart.md](./quickstart.md) セクション5「既存機能の回帰確認」の手順1〜6を実行し、項目の登録・編集・削除、ワンクリックコピー、マスク表示切替、項目名検索、項目の `▲▼` 並び替え、選択モードの一括削除・一括グループ変更、テーマ切替に回帰がないことを確認する
- [X] T051 [quickstart.md](./quickstart.md) セクション7「自動テストの実行」に従い `npm test` を実行し、`tests/unit/` の全テスト（新規 `tabOrder.test.js` を含む）がパスすることを確認する
- [X] T052 `npx reqord impact analyze` を実行し、影響範囲があれば Reqord の該当要件・仕様の更新PRを提案する（`CLAUDE.md` の開発フロー4）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし
- **Foundational (Phase 2)**: Setup 完了後。**全ユーザーストーリーをブロックする**
- **User Stories (Phase 3〜6)**: Foundational 完了後。フェーズは上から順に実行できる
- **Polish (Phase 7)**: 実装対象のユーザーストーリーがすべて完了後

### User Story Dependencies

- **US1 (P1 / Phase 3)**: Foundational 完了後に着手可能。他ストーリーへの依存なし
- **US2 (P2 / Phase 4)**: Foundational 完了後に着手可能。T020 で US1 の T013（暫定の `click` 実装）を置き換えるため、US1 の後に実装する
- **US4 (P4 / Phase 5)**: Foundational 完了後に着手可能。T034 は US2 の T020 で設定した `canDrag` に条件を足すため、US2 の後に実装する
- **US3 (P3 / Phase 6)**: T040〜T043 / T046 / T047 は他ストーリーへの依存なし。**T044 / T045 は US4 の T030 / T031 で作る入力欄に手を入れる**ため、US4 の後に実装する

### フェーズ順が優先度順と一致しない理由

US3（P3）の入力欄側タスク（T044 / T045）が US4（P4）のインライン編集に依存するため、
**US4 を US3 より先**に置いている。US3 を先に実装すると、`maxlength` と文字数表示を撤去予定の
タブ内インライン入力（`tab-rename-input`）に一度実装することになり、US4 で作り直しになる。

US3 のうち表示側（T040〜T043）だけを US4 より先に出すことは可能。その場合 T044 / T045 のみを
US4 の後に回す。

### Within Each User Story

- テストタスク（T002 / T005 / T017 / T028 / T040）は実装前に書き、失敗することを確認する
- ストレージ層（`tabOrder.js` / `groupRepository.js`）→ UI層（`groupPanel.js` / `sidepanel.js`）の順
- CSSタスクは対応するDOM生成タスクと並行して進められる
- 各ストーリーの最後に `npm test` と quickstart の該当セクションを実行してから次へ進む

### 同一ファイルを触るため並列にできないタスク

| ファイル | 該当タスク（実行順） |
|---------|-----------|
| `src/sidepanel/sidepanel.js` | T014（ボタン追加）→ T023（`renderTabs` 書き換え）→ T024（`init`）→ T035（管理操作の撤去）→ T043（`title` 属性）→ T049（整理） |
| `src/sidepanel/groupPanel.js` | T010 → T011 → T012 → T013 → T020 → T022 → T025 → T029 → T030 → T031 → T032 → T034 → T044 → T045 |
| `src/sidepanel/sidepanel.css` | T009 → T015 → T021 → T036 → T037 → T042 |
| `src/storage/groupRepository.js` | T006 → T018 → T033 → T041 |
| `tests/unit/groupRepository.test.js` | T005 → T017 → T028 → T040 |

### Parallel Opportunities

- **Phase 2**: T002 は他タスクと独立して着手できる
- **Phase 3**: T009（CSS）と T015（CSS）は T008 のDOM構造が決まれば、T010〜T014（JS）と並行して進められる
- **Phase 4**: T021（CSS）は T019 / T020（JS）と並行して進められる
- **Phase 5**: T036 / T037（CSS）は T029〜T035（JS）と並行して進められる
- **Phase 6**: T042（CSS）は T040 / T041（storage層）と並行して進められる
- **Phase 7**: T048（README）と T049（コード整理）は並行して進められる
- ストーリー間の並列: US1 と US4 は互いに独立しているため、別の担当者が同時に進められる（ただし
  `groupPanel.js` を両方が触るため、実際には US1 の T010 でファイルの骨格ができてからにする）
- 同じ `sidepanel.css` を触るCSSタスクは、担当を分ける場合は追加位置を分けて衝突を避ける

---

## Parallel Example: User Story 1

```text
# T008 でDOM構造を確定させたあと、以下を並行して進められる:
Task: "src/sidepanel/sidepanel.css にパネルのスタイルを追加する（T009）"
Task: "src/sidepanel/sidepanel.css にパネルを開くボタンのスタイルを追加する（T015）"
Task: "src/sidepanel/groupPanel.js に縦リストの描画を実装する（T010）"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1: Setup（T001）
2. Phase 2: Foundational（T002〜T007）— **全ストーリーをブロックする**
3. Phase 3: User Story 1（T008〜T016）
4. **停止して検証**: quickstart セクション1 を実行し、グループ20個以上の状態で「探せる」ことを確認する
5. この時点で3課題のうち最大のもの（探しにくい）が解消しているため、単独でリリース可能
   （`#group-panel-add` は T008 で `hidden` にしてあるため、無反応のボタンは露出しない）

### Incremental Delivery

1. Setup + Foundational → 並び順の読み出しと正規化が動く
2. US1 追加（Phase 3）→ パネルで一覧・絞り込み・切替（**MVP**）
3. US2 追加（Phase 4）→ ドラッグ並び替え、タブ順と起動時タブへの反映
4. US4 追加（Phase 5）→ 管理操作のパネル集約、タブバーを切替専用に
5. US3 追加（Phase 6）→ 名前の上限20文字、入力欄の打ち止めと文字数表示、タブの末尾省略
6. Phase 7 → README の修正、回帰確認、`reqord impact analyze`

各段階で既存機能を壊さない。US2 まで完了すれば req-000010 の3課題のうち2つが解消する。

### 実装中に仕様との差異が出た場合

`.specify/memory/constitution.md` の Reqord運用ルールに従い、**実装を即座に停止**し、
`feedback` ラベル付きの GitHub Issue を作成して Reqord への反映を提案する。
`/speckit.taskstoissues` は使用しない（Issue化は `reqord task create` / `reqord task sync` で行う）。

---

## Notes

- `[P]` は別ファイル・依存なしで並列実行できるタスク
- `[Story]` ラベルはトレーサビリティのためユーザーストーリーに対応させている。フェーズ順は実行順で、
  ストーリーの優先度順（P1→P2→P3→P4）とは一致しない
- テストタスクは実装前に書き、失敗を確認してから実装に進む
- タスク単位、または論理的なまとまりごとにコミットする
- 各 Checkpoint で停止し、ストーリー単位で独立に検証できる
- `dragReorder` は行の高さが一定であることを前提にしている。行に折り返す要素やインライン入力欄を
  追加するときは、行の高さが変わらないことを必ず確認する（T037）
- T024 により起動時に開くタブが「最初のグループ」から「既定の並び順の先頭（未分類）」に変わる。
  利用者から見える挙動の変化なので、spec.md の Assumptions に記載済み。README の追記（T048）でも触れる
