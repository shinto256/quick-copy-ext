# Implementation Plan: サイドパネルのキーボード操作対応（縦リストのフォーカス・キーボード並び替え・オーバーレイのフォーカス管理）

**Branch**: `feature/req-000011`（spec ディレクトリ: `007-sidepanel-keyboard`） | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-sidepanel-keyboard/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

`006-group-navigation` で実装した全グループパネルに、キーボード操作の経路を追加する。

1. 縦リストの各行に `tabindex="0"` を付けてタブ移動の対象にし、`Enter` / `Space` でグループを切り替える。フォーカス表示は既存のグローバルな `:focus-visible`（`sidepanel.css:114`）がそのまま適用されるため、CSSの追加は不要。
2. 行にフォーカスがある状態の `Alt` + `↑` / `Alt` + `↓` で、その行を1つ上・1つ下へ移動させる。永続化は既存の `groupRepository.reorderTabs()` を使い、再描画後に同じ `data-tab-id` の行へフォーカスを戻す。
3. オーバーレイのフォーカス管理を `src/sidepanel/focusTrap.js` として切り出し、全グループパネルと項目登録フォームの双方に適用する。表示中は `Tab` / `Shift` + `Tab` がオーバーレイ内を循環し、閉じたときは開く前にフォーカスしていた要素へ戻す。あわせて項目登録フォームを `Escape` で閉じられるようにする。

技術アプローチ: 永続データの追加・変更はない。`dragReorder` にも手を入れない（`onReorder` の受け口をキーボード経路から使い回すのではなく、`groupPanel` 内で並び順配列を組み替えて `reorderTabs` を呼ぶ）。UI層(`src/sidepanel/`)・データ層(`src/storage/`)の2層構成は維持し、storage層は変更しない。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。TypeScriptやトランスパイルは行わない
（既存specの踏襲、ノービルド方針）

**Primary Dependencies**: なし（Vanilla JS）。DOM標準API（`tabindex` / `focus()` / `KeyboardEvent` /
`element.contains()`）のみ。アクセシビリティ用のライブラリは導入しない

**Storage**: 変更なし。並び順（`tabOrder`）の更新に既存の `groupRepository.reorderTabs()` を使うのみで、
storage層のファイルは一切変更しない

**Testing**: vitest + `chrome.storage.local` のmock（既存 `tests/unit/chromeMock.js`）。
本featureで追加するロジックのうち、**並び順配列の組み替え**（1つ上・1つ下への移動、境界での無変更）は
DOMに依存しない純関数として切り出し、ユニットテスト対象とする。フォーカス移動・キーイベント処理・
フォーカストラップはDOM操作が中心のため、既存specと同方針でユニットテスト対象外とし、
`quickstart.md` の手動検証で担保する

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）。既存の常駐サイドパネル

**Project Type**: browser-extension（単一プロジェクト構成）

**Performance Goals**: 本featureに固有の性能目標はない。キーボードによる移動1回あたりの永続化は
既存のドラッグ確定時と同じ1回の書き込みで収まる

**Constraints**: ノービルド配布、storage層は変更不可、**ポインタ操作（タップでの切替、ドラッグでの
並び替え、その判定）に回帰を出さない**（spec FR-006 / SC-008）、フォーカス表示は既存の
`:focus-visible` に任せ独自表現を追加しない（spec FR-002 / SC-007）

**Scale/Scope**: User Story 3件（P1〜P3）、FR 21件、SC 8件。新規ファイル2件・既存ファイル変更3件・
新規テストファイル1件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000011 が `status: approved`（PR #41 マージ済み） |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力および spec.md 冒頭「Reqord要件要約」に req-000011 のID・内容要約を明記 |
| Reqord運用ルール: Issue化はReqord側のみ | 該当なし(Phase時点) | `/speckit-tasks` 以降で `/speckit-taskstoissues` を使わないことを遵守予定 |
| Reqord運用ルール: 仕様変更時は実装停止 | 該当なし(Phase時点) | 実装フェーズでの運用ルールとして継続適用 |

違反なし。Complexity Trackingの記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/007-sidepanel-keyboard/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # 本featureでは永続データの変更がないため作成しない
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

`data-model.md` は作成しない。本featureで追加・変更する永続データがなく（spec の Key Entities 参照）、
並び順の構造は `specs/006-group-navigation/data-model.md` に定義済みのものをそのまま使う。

### Source Code (repository root)

```text
src/
├── sidepanel/                # UI層
│   ├── focusTrap.js           # 新規: オーバーレイのフォーカス閉じ込めと復帰（汎用）
│   ├── listReorder.js         # 新規: 並び順配列の組み替え（純関数。DOM非依存）
│   ├── groupPanel.js          # 変更: 行を tabindex="0" に、Enter/Space で切替、
│   │                           # Alt+矢印で並び替え、再描画後のフォーカス復帰、focusTrap 適用
│   ├── sidepanel.js           # 変更: 項目登録フォームに Escape と focusTrap を適用
│   ├── dragReorder.js         # 変更なし
│   ├── itemFilter.js          # 変更なし
│   └── maskDisplay.js         # 変更なし
├── background/                # 変更なし
└── storage/                   # 変更なし（tabOrder.js / groupRepository.js とも手を入れない）

tests/
└── unit/
    ├── listReorder.test.js        # 新規: moveInList の境界と非破壊性
    └── (既存6ファイルは変更なし)

src/sidepanel/sidepanel.css        # 変更: 行のフォーカス時の重なり順のみ（フォーカス表現自体は既存の
                                   # :focus-visible をそのまま使い、追加しない）
```

**Structure Decision**: 既存の2層構成を維持し、storage層には一切触らない。UI層に2ファイルを新設する。

- `focusTrap.js`: 全グループパネルと項目登録フォームの2箇所で同じ振る舞いが必要なため、
  「オーバーレイ要素を渡すと、表示中のフォーカス閉じ込めと閉じたときの復帰を行う」形で切り出す。
  `groupPanel.js` / `sidepanel.js` の双方から使う。
- `listReorder.js`: 「配列の要素を1つ上/下へ移動する」だけの純関数。`groupPanel.js` に埋めると
  DOM操作と混ざってユニットテストできないため分離する。境界での無変更（spec FR-011）を
  自動テストで担保できるようにする狙い。

`groupPanel.js` は現在428行あるが、本featureで追加するのはキーイベント処理とフォーカス復帰で、
上記2ファイルへ切り出した後の増分は小さい。新規ディレクトリ・新規UIページは作らない。

## Constitution Check（Phase 1設計後の再評価）

`research.md` / `contracts/` / `quickstart.md` 生成後も、原則I・IIおよびReqord運用ルールへの違反なし。
storage層を変更しないためRepositoryパターンへの影響はなく、technical.yaml の既定decision
（Vanilla JS、ノービルド、vitest + chrome API mock）すべてと整合している。アクセシビリティ用の
ライブラリを追加せずDOM標準APIのみで実装するため、ノービルド方針を崩さない。

新規ファイル2件のうち `listReorder.js` は純関数としてユニットテスト可能な形にするための分離であり、
`focusTrap.js` は2箇所で共有する振る舞いの重複を避けるための分離。いずれも既存の2層構成の枠内に
収まるため、新たな複雑性の正当化（Complexity Tracking記入）は不要。

## Complexity Tracking

*Constitution Checkに違反なし。本セクションの記入は不要。*
