---

description: "Task list for タブバーの横スクロール廃止と幅追従表示"
---

# Tasks: タブバーの横スクロール廃止と幅追従表示

**Input**: Design documents from `/specs/010-tab-overflow/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[contracts/](./contracts/)

**Tests**: 含める。**表示するタブを決めるロジックは境界の条件が多いため純関数に切り出して
ユニットテスト対象にする**（[contracts/tab-overflow-contract.md](./contracts/tab-overflow-contract.md)）。
DOMの計測・`hidden` の付け外し・`ResizeObserver` の配線はDOM操作が中心のため、既存specと
同方針でユニットテスト対象外とし、[quickstart.md](./quickstart.md) の手動検証で担保する。

**Organization**: タスクはユーザーストーリー単位でまとめる。

**⚠️ 3つのストーリーは分けてリリースできない**: US1（収まらないタブを隠す）だけでは幅を広げても
隠れたまま（US2 が必要）、かつ選択中のタブが見えなくなる（US3 が必要）。**US2 と US3 は US1 の
副作用を埋めるものなので、3つを1つの変更として完了させる。**

**Foundational フェーズは不要**: 全ストーリーが同じ判定ロジック（`tabOverflow.js`）に依存するが、
そのロジック自体が US1〜US3 の3条件をまとめて表現するものなので、Phase 2 に含める。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（別ファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US3）

## Path Conventions

単一プロジェクト構成。**storage層（`src/storage/`）は本featureで一切変更しない。**

---

## Phase 1: Setup

- [X] T001 `npm test` を実行し、変更前の全テストがパスすることを確認する（ベースライン記録。`tests/unit/` 配下8ファイル・166テスト）

---

## Phase 2: User Story 1 / 2 / 3 - 横スクロールを廃止し幅に追従する (Priority: P1) 🎯

**Goal**: タブバーの横スクロールをなくし、幅に収まるタブだけを表示し、幅の変化に追従し、選択中のタブは必ず表示する状態にする

**Independent Test**: グループを10個以上登録してタブバーに横スクロールバーが出ないことを確認し、サイドパネルの幅を広げると収まるタブが表示されること、全グループパネルから並び順の後ろのグループへ切り替えるとそのタブが表示されることを確認する（[quickstart.md](./quickstart.md) セクション1〜3）

### Tests

- [X] T002 [US1] `tests/unit/tabOverflow.test.js` を新規作成し、`visibleTabIndexes` のテスト観点（[contracts/tab-overflow-contract.md](./contracts/tab-overflow-contract.md) の「テスト観点」の全項目）を書く。**全部収まる / 一部だけ収まる / 1つも収まらない、選択中のタブが収まる位置にある / ない、`gap` の境界、非破壊、タブ51個の上限規模**を含める。実装前なので失敗することを確認する

### Implementation

- [X] T003 [US1] `src/sidepanel/tabOverflow.js` を新規作成し、`visibleTabIndexes(tabWidths, availableWidth, gap, selectedIndex)` を実装して T002 をパスさせる。ルールは4手順（先頭から詰める → 選択中が含まれればそのまま返す → 含まれなければ選択中の幅を確保して詰め直す → 選択中すら収まらなければ選択中のみ）。`Set` を返す。引数は変更しない
- [X] T004 [P] [US1] `src/sidepanel/sidepanel.css` の `.tabs` の `overflow-x: auto` を `overflow: hidden` に変更する（spec FR-001）。あわせて `.tab-panel-open` から `position: sticky` と `right: 0` を撤去する（横スクロールがなくなり不要。`margin-left: auto` は残す。[research.md](./research.md) R-004）
- [X] T005 [US1] `src/sidepanel/sidepanel.js` に、描画済みのタブの幅を測って表示可否を適用する処理を追加する。各タブの `getBoundingClientRect().width` を測り、タブバーの内容領域の幅から末尾のボタンの幅とその前の `gap` を差し引いて `availableWidth` を求め、`visibleTabIndexes` の結果に含まれないタブに `hidden` 属性を付ける（末尾のボタンには付けない。spec FR-002 / FR-003 / FR-006）。`gap` は `getComputedStyle` から実測する
- [X] T006 [US3] `src/sidepanel/sidepanel.js` の上記処理で、選択中のタブの位置（`selectedTabId` に一致するタブのインデックス）を `visibleTabIndexes` に渡す。該当がなければ `-1` を渡す（spec FR-005 / FR-008）
- [X] T007 [US1] `src/sidepanel/sidepanel.js` の `renderTabs()` の末尾で、T005 の処理を呼ぶ。**全タブを描画した直後に一度だけ幅を測る**（隠す前に測るので、隠す予定のタブも正しい幅が取れる。[research.md](./research.md) R-001）
- [X] T008 [US2] `src/sidepanel/sidepanel.js` に、直近に測った幅の配列とタブ要素の配列をモジュールスコープで保持する処理を追加する。`ResizeObserver` の通知でこれを使い回し、DOMを作り直さずに表示可否だけを再計算できるようにする（[research.md](./research.md) R-002）
- [X] T009 [US2] `src/sidepanel/sidepanel.js` に `ResizeObserver` を追加してタブバー（`tabsEl`）を監視する。通知を受けたら表示可否だけを再計算する。**タブバーの幅が0のときは何もしない**（サイドパネルが表示されていない状態。spec Edge Cases。[research.md](./research.md) R-002）
- [X] T010 `npm test` を実行し、`tests/unit/tabOverflow.test.js` の追加分（T002）と `tests/unit/` の既存テストがすべてパスすることを確認する
- [ ] T011 [US1] [quickstart.md](./quickstart.md) セクション1「横スクロールバーが出ない」の手順1〜7を実行し、FR-001 / FR-003 / FR-006 / FR-007 / FR-013 / FR-014 と SC-001 / SC-002 / SC-005 / SC-006 / SC-007 / SC-008 を確認する
- [ ] T012 [US2] [quickstart.md](./quickstart.md) セクション2「幅を変えると表示が追従する」の手順1〜8を実行し、FR-004 / FR-009 / FR-010 / FR-011 / FR-012 と SC-003 を確認する
- [ ] T013 [US3] [quickstart.md](./quickstart.md) セクション3「いま見ているグループが分かる」の手順1〜8を実行し、FR-005 / FR-008 と SC-004 を確認する。**手順3（隠れていたグループへ切り替えるとそのタブが表示される）と手順5（先頭のグループでは他が余分に隠れない）が本specで最も壊れやすい部分**

**Checkpoint**: 横スクロールバーが出ず、幅に追従し、選択中のタブが必ず見える

---

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T014 [P] `specs/006-group-navigation/spec.md` の該当箇所（タブバーの横スクロールを前提にした記述）に、本spec（`010-tab-overflow`）で置き換わった旨を追記する。**同spec FR-006（全グループパネルの縦リストで全件を確認できる）は変更していないことを明示する**（「スクロール」がどちらの話か曖昧にしないため）
- [X] T015 [P] `README.md` のタブバーに関する記述を更新する。幅に収まらないタブは表示せず全グループパネルから到達すること、選択中のタブは必ず表示されることを追記する。あわせて `specs/010-tab-overflow/spec.md` と `quickstart.md` への参照を「詳細な仕様」「動作確認の手順」の各リストに追加する
- [ ] T016 [quickstart.md](./quickstart.md) セクション4「既存機能の回帰確認」の手順1〜9を実行し、タブの切替・選択中の見た目・末尾省略・全グループパネルの各機能・項目一覧の各機能に回帰がないことを確認する
- [X] T017 `npx reqord impact analyze req-000014` を実行し、影響範囲があれば Reqord の該当要件・仕様の更新PRを提案する（`CLAUDE.md` の開発フロー4）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし
- **Phase 2**: Setup 完了後。**US1・US2・US3 を1つの変更として完了させる**
- **Polish (Phase 3)**: Phase 2 の完了後

### 同一ファイルを触るため並列にできないタスク

| ファイル | 該当タスク（実行順） |
|---------|-----------|
| `src/sidepanel/tabOverflow.js` | T003 のみ |
| `src/sidepanel/sidepanel.js` | T005（幅の計測と適用）→ T006（選択中の位置）→ T007（`renderTabs` から呼ぶ）→ T008（幅の配列を保持）→ T009（`ResizeObserver`） |
| `src/sidepanel/sidepanel.css` | T004 のみ |
| `tests/unit/tabOverflow.test.js` | T002 のみ |

### Parallel Opportunities

- T002 / T003（純関数とそのテスト）は `sidepanel.js` に触らないため、T004（CSS）と並行して進められる
- T004（CSS）は T005〜T009（JS）と並行して進められる
- T014 / T015（別ファイルのドキュメント）は並行して進められる

---

## Implementation Strategy

3つのストーリーは分けてリリースできないため、Phase 2 を1まとまりとして完了させる。

1. Phase 1: Setup（T001）
2. Phase 2: 純関数とテスト（T002〜T003）→ CSS（T004）→ 計測と適用（T005〜T007）→
   幅の変化への追従（T008〜T009）→ テスト（T010）
3. **停止して検証**: quickstart セクション1〜3 を実行する。**セクション3（選択中のタブが必ず
   見える）が最も壊れやすい**
4. Phase 3: spec 006 とREADMEの更新、回帰確認、`reqord impact analyze`

### 実装中に仕様との差異が出た場合

`.specify/memory/constitution.md` の Reqord運用ルールに従い、**実装を即座に停止**し、
`feedback` ラベル付きの GitHub Issue を作成して Reqord への反映を提案する。
`/speckit.taskstoissues` は使用しない。

---

## Notes

- `[P]` は別ファイル・依存なしで並列実行できるタスク
- テストタスク（T002）は実装前に書き、失敗を確認してから実装に進む
- **storage層（`src/storage/`）は本featureで一切変更しない**。どのタブを表示するかは画面の幅から
  都度決まる一時的な状態であり、保存しない
- **幅の計測は「全タブを描画した直後に一度だけ」**。隠す前に測るので、隠す予定のタブも正しい幅が
  取れる。表示可否が変わるたびに測り直す必要がない
- **`ResizeObserver` の通知では `renderTabs()` を呼ばない**。ストレージの読み出しとDOMの再構築が
  ドラッグ中に繰り返されるのを避ける。表示可否は幅だけで決まる
- `hidden` 属性を使う理由: 要素がレイアウトから外れるためタブバーの幅に影響せず、キーボードの
  フォーカス移動の対象にもならない（spec FR-013）。`visibility: hidden` は領域を占めたままなので不適
- **選択中のタブが収まる位置にある通常のケースでは、他のタブを余分に隠さない**（spec FR-008）。
  判定の手順2がこれを担う
