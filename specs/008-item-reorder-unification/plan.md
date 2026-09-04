# Implementation Plan: 項目並び替え操作の統一（カードのキーボード操作と上下移動ボタンの撤去）

**Branch**: `feature/req-000012`（spec ディレクトリ: `008-item-reorder-unification`） | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-item-reorder-unification/spec.md`

## Summary

項目カードの並び替えを、グループの縦リストと同じ「ドラッグ操作 + `Alt` + 矢印」の2手段に統一する。

1. `.item-card` に `tabindex="0"` を付けてタブ移動の対象にし、`Enter` / `Space` で値をコピーする
   （ポインタでのタップと同じ結果）。フォーカス表示は既存のグローバルな `:focus-visible` が
   そのまま適用されるため、CSSは重なり順の指定だけを足す。
2. カードの `keydown` で `Alt` + `↑` / `Alt` + `↓` を受け、`007-sidepanel-keyboard` で作った
   `moveInList`（純関数）と既存の `persistReorder` を組み合わせて並び替える。再描画後は
   `data-item-id` を鍵にフォーカスを戻す。
3. `.reorder-controls`（`▲▼`）とその生成コード・CSS・`moveItem` 関数を撤去する。

技術アプローチ: 新規ファイルは作らない。`moveInList` / `focusTrap` はいずれも既存。
storage層は変更しない（`ItemRepository.reorderGroup()` をそのまま使う）。グループの縦リストで
書いたキーボード処理と同じ形をカード側に置くため、**キーの判定と移動の骨格を共通化する**か、
同じ構造を素直に並べるかを Phase 0 で決める。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。ノービルド

**Primary Dependencies**: なし（Vanilla JS）。DOM標準APIのみ

**Storage**: 変更なし。`ItemRepository.reorderGroup()` を既存のまま使う

**Testing**: vitest。本featureで追加する純粋なロジックはない（`moveInList` は既存でテスト済み）。
カードのキーイベント処理とフォーカス復帰はDOM操作が中心のため、既存specと同方針でユニットテスト
対象外とし、`quickstart.md` の手動検証で担保する。**既存の159テストに回帰がないことを確認する**

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）

**Project Type**: browser-extension（単一プロジェクト構成）

**Performance Goals**: 本featureに固有の性能目標はない

**Constraints**: **US2（ボタン撤去）は US1（キーボード操作）の後に実施する**（順序を逆にすると
キーボードで並び替えられない状態が生まれ、req-000008 FR-018 を一時的に破る）。既存のポインタ操作
（ドラッグ、タップでのコピー、5px閾値の判定）に回帰を出さない（spec FR-014 / SC-008）。
フォーカス表示は既存の `:focus-visible` に任せ独自表現を追加しない（spec FR-002 / SC-007）

**Scale/Scope**: User Story 2件（P1・P2）、FR 14件、SC 8件。新規ファイルなし・既存ファイル変更3件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000012 が `status: approved`（PR #43 マージ済み） |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力および spec.md 冒頭「Reqord要件要約」に req-000012 のID・内容要約を明記 |
| Reqord運用ルール: Issue化はReqord側のみ | 該当なし(Phase時点) | `/speckit-taskstoissues` を使わない |
| Reqord運用ルール: 仕様変更時は実装停止 | **確認済み** | 本featureは既存spec 003 の FR-002 / SC-001 を置き換える。この変更は req-000012 として起票・承認済みであり、実装中に発生した想定外の逸脱ではない |

違反なし。Complexity Trackingの記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/008-item-reorder-unification/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

`data-model.md` は作成しない（永続データの追加・変更なし）。

### Source Code (repository root)

```text
src/
├── sidepanel/
│   ├── sidepanel.js           # 変更: .item-card に tabindex、keydown で Enter/Space と Alt+矢印、
│   │                           # 再描画後のフォーカス復帰、.reorder-controls と moveItem を撤去
│   ├── sidepanel.css          # 変更: .item-card:focus-visible の重なり順を追加、
│   │                           # .reorder-controls / .reorder-button を削除
│   ├── listReorder.js         # 変更なし（既存の moveInList を使う）
│   ├── groupPanel.js          # 変更なし
│   ├── dragReorder.js         # 変更なし
│   ├── focusTrap.js           # 変更なし
│   ├── itemFilter.js          # 変更なし
│   └── maskDisplay.js         # 変更なし
└── storage/                   # 変更なし

specs/003-sidepanel-list-enhancements/
├── spec.md                    # 変更: FR-002 / SC-001 に本specで置き換わった旨を追記
└── quickstart.md              # 変更: ▲▼ の手順をキーボード操作に置き換え

README.md                      # 変更: 項目の並び替え手段の記述を更新
```

**Structure Decision**: 新規ファイルを作らない。`007-sidepanel-keyboard` で `moveInList`（純関数）と
`focusTrap` を切り出しておいたため、本featureは既存の部品を組み合わせるだけで済む。
`sidepanel.js` は647行あるが、本featureは `▲▼` の生成コード（約25行）と `moveItem`（約12行）を
撤去した上でキーボード処理（約20行）を足すため、**行数は減る**見込み。

## Constitution Check（Phase 1設計後の再評価）

`research.md` / `contracts/` / `quickstart.md` 生成後も違反なし。storage層を変更せず、
technical.yaml の既定decision（Vanilla JS、ノービルド、Repositoryパターン）すべてと整合している。
新規ファイルを作らないため構成上の複雑性も増えない。Complexity Tracking の記入は不要。

## Complexity Tracking

*Constitution Checkに違反なし。本セクションの記入は不要。*
