# Implementation Plan: グループナビゲーション改善（全グループパネル・並び替え・名称長制御）

**Branch**: `feature/req-000010`（spec ディレクトリ: `006-group-navigation`） | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-group-navigation/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

既存のタブバー（`002-side-panel-ui`で実装済み）による1クリック切替を維持したまま、タブバー末尾に
全グループパネルを開く操作を追加する。パネルはサイドパネル全面のオーバーレイで、未分類を含む全タブの
縦リスト、グループ名の絞り込み、ドラッグによる並び替え、行内インライン編集による名称変更・追加、
削除を担う。タブ内の三点リーダーは撤去してタブバーを切替専用にする。あわせてグループ名の上限を
30文字から20文字へ下げ、入力欄で打ち止めにする。

技術アプローチ: タブの並び順の情報源を新しい `chrome.storage.local` キー `tabOrder`（未分類センチネル
`"__unassigned__"` とグループIDの配列）に一本化する。既存の `groups` 配列は集合として扱い、配列順を
順序情報に使わない。正規化を純関数 `src/storage/tabOrder.js` に切り出し、読み出しのたびに実在する
グループと突き合わせることで FR-019 の自己収束を実現する。ドラッグは Pointer Events による汎用機構
`src/sidepanel/dragReorder.js` として切り出し、「並び替え後の順序を受け取って保存する」境界に留める。
パネルの描画・絞り込み・インライン編集は `src/sidepanel/groupPanel.js` に分離する。
`sidepanel.js` は現在778行あり、パネルとドラッグ処理を同ファイルに追加すると責務が過大になるため、
この3ファイル分離を行う。UI層(`src/sidepanel/`)・データ層(`src/storage/`)の2層構成は維持する。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。TypeScriptやトランスパイルは行わない
（既存specの踏襲、ノービルド方針）

**Primary Dependencies**: なし（Vanilla JS）。Chrome Extension APIs（`chrome.storage`）と
DOM標準API（Pointer Events、`requestAnimationFrame`、CSS Transitions）のみを使用。ドラッグ&ドロップの
ライブラリは導入しない

**Storage**: `chrome.storage.local`。既存キー `items` / `groups` / `settings` に加えて
**新規キー `tabOrder`（`string[]`）を追加**する。`groups` のスキーマ（`{id, name}`）は変更せず、
配列順が順序情報として使われなくなる点のみが変わる（既存データはそのまま読める）

**Testing**: vitest + `chrome.storage.local` のmock（既存 `tests/unit/chromeMock.js` を再利用）。
`src/storage/tabOrder.js`（純関数）と `groupRepository.js` の追加関数はユニットテスト対象。
`dragReorder.js` / `groupPanel.js` のDOM操作は既存specと同方針でユニットテスト対象外とし、
`quickstart.md` の手動検証シナリオで担保する

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）。既存の常駐サイドパネル
（`src/sidepanel/sidepanel.html`）に機能追加する。ポインタ操作はマウス・トラックパッドを前提とし、
タッチ環境での縦スクロールと並び替えの競合は spec のスコープ外

**Project Type**: browser-extension（単一プロジェクト構成。frontend/backend分割なし）

**Performance Goals**: パネルを開く操作から縦リスト表示まで1秒以内(SC-007)、グループ50個でも
3アクション以内で目的のグループに到達(SC-001)、最下部から先頭への移動が1ドラッグで完了(SC-002)。
ドラッグ中は `pointermove` ごとの矩形計測を行わず、行高と移動量の算術で挿入位置を求める

**Constraints**: ノービルド配布、グループ上限50件は変更なし、既存storage層の関数シグネチャは変更不可
（`groupRepository` は関数追加と `NAME_MAX_LENGTH` の値変更のみ）、既存の項目登録・コピー・マスク表示・
項目名検索・選択モード（一括削除・一括グループ変更）の挙動は変更しない、既に保存済みの20文字超の
グループ名は切り詰めない

**Scale/Scope**: User Story 4件（P1〜P4）、FR 36件（サブ番号 FR-002a / 008a / 008b / 009a / 009b /
025a を含む）、SC 9件。新規ファイル3件・既存ファイル変更6件・新規テストファイル1件。個人が各自の
端末で利用する規模（同時多接続やサーバー側スケールは対象外）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000010 が `status: approved`（PR #38 マージ済み） |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力および spec.md 冒頭「Reqord要件要約」に req-000010 のID・内容要約を明記 |
| Reqord運用ルール: Issue化はReqord側のみ | 該当なし(Phase時点) | `/speckit-tasks` 以降で `/speckit-taskstoissues` を使わないことを遵守予定 |
| Reqord運用ルール: 仕様変更時は実装停止 | 該当なし(Phase時点) | 実装フェーズでの運用ルールとして継続適用 |

違反なし。Complexity Trackingの記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/006-group-navigation/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── sidepanel/                # UI層
│   ├── sidepanel.html         # 全グループパネルのコンテナを追加。グループ名入力欄に maxlength を付与
│   ├── sidepanel.css          # パネル・縦リスト・ドラッグ中の状態・退避アニメーションのスタイルを追加。
│   │                           # タブに max-width + 末尾省略を追加。撤去する tab-menu / tab-menu-button /
│   │                           # tab-rename-input のスタイルを削除
│   ├── sidepanel.js           # renderTabs を tabOrder ベースへ。タブの三点リーダーとインライン入力を撤去。
│   │                           # 「▾ N」ボタンを追加。init の初期選択を tabOrder 先頭へ
│   ├── groupPanel.js          # 新規: パネルの開閉・縦リスト描画・絞り込み・行内インライン編集・
│   │                           # 行メニュー(名称変更/削除)・グループ追加
│   ├── dragReorder.js         # 新規: Pointer Events による汎用の縦リスト並び替え機構
│   ├── itemFilter.js          # UNASSIGNED_TAB_ID を storage/tabOrder.js からの再エクスポートに変更
│   └── maskDisplay.js         # 変更なし
├── background/                # 変更なし
└── storage/                   # データ層
    ├── tabOrder.js             # 新規: UNASSIGNED_TAB_ID / normalizeTabOrder / isValidTabOrder（純関数）
    ├── groupRepository.js      # NAME_MAX_LENGTH を 20 へ。listTabOrder() / reorderTabs() を追加。
    │                           # remove() で tabOrder から該当IDを除去
    ├── itemRepository.js       # 変更なし（件数集計に既存 list() を再利用）
    ├── settingsRepository.js   # 変更なし
    ├── storageClient.js        # 変更なし
    └── errors.js               # 変更なし

tests/
└── unit/
    ├── tabOrder.test.js           # 新規: normalizeTabOrder / isValidTabOrder
    ├── groupRepository.test.js    # 既存 + listTabOrder / reorderTabs / NAME_MAX_LENGTH / remove のテスト
    ├── itemRepository.test.js     # 変更なし
    ├── settingsRepository.test.js # 変更なし
    ├── maskDisplay.test.js        # 変更なし
    ├── itemFilter.test.js         # 変更なし（再エクスポート後も同じ import 経路で動く）
    └── contrastRatio.test.js      # 変更なし

README.md                          # 未実装の「項目のドラッグ&ドロップ」記述を実態に合わせて修正し、
                                   # 本機能（全グループパネル・グループ並び替え）を追記
```

**Structure Decision**: 既存の「UI層(`sidepanel/`)／データ層(`storage/`)」2層構成を維持する。
新規ディレクトリ・新規UIページは作らない。ただし `sidepanel.js` が既に778行あるため、パネル描画と
ドラッグ機構を同ファイルに足すのではなく、UI層に `groupPanel.js` / `dragReorder.js` を新設して
責務を分ける。並び順の正規化はDOMにも `chrome` APIにも依存しない純関数なので、`groupRepository` と
`sidepanel` の双方から使える `storage/tabOrder.js` に置く（storage層がUI層をimportする逆方向の依存を
避けるため、既存の `sidepanel/itemFilter.js` にある `UNASSIGNED_TAB_ID` の定義を storage 側へ移し、
`itemFilter.js` からは再エクスポートする。既存の import 経路は変更不要）。

## Constitution Check（Phase 1設計後の再評価）

`research.md` / `data-model.md` / `contracts/` / `quickstart.md` 生成後も、原則I・IIおよび
Reqord運用ルールへの違反なし。データアクセスは既存のRepositoryパターンを維持し（`groupRepository` に
関数追加）、technical.yaml の既定decision（Repositoryパターン採用、Vanilla JS、ノービルド、
vitest + chrome API mock）すべてと整合している。ドラッグ&ドロップもライブラリを追加せずDOM標準APIのみで
実装するため、ノービルド方針を崩さない。

新規ファイル3件の追加は、既存 `sidepanel.js`（778行）へ約400行を追記する代替案よりも1ファイルの責務が
明確になり、うち2件（`tabOrder.js`）はユニットテスト可能な純関数として切り出せる。既存の2層構成と
Repositoryパターンの枠内に収まるため、新たな複雑性の正当化（Complexity Tracking記入）は不要。

## Complexity Tracking

*Constitution Checkに違反なし。本セクションの記入は不要。*
