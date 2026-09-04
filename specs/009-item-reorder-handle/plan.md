# Implementation Plan: 項目カードの並び替えハンドル（ドラッグ起点を掴み手に限定する）

**Branch**: `feature/req-000013`（spec ディレクトリ: `009-item-reorder-handle`） | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-item-reorder-handle/spec.md`

## Summary

1. `dragReorder` に **`handleSelector` オプション**を追加する。指定された場合、`pointerdown` が
   そのセレクタに一致する要素の上で起きたときだけドラッグを開始する。一致しない場所（行本体）を
   押した操作は、閾値を超えたらドラッグもタップ通知も行わずに終わる。
2. 項目カードの左端に `.item-card-handle`（`⠿`）を追加し、`attachDragReorder` に
   `handleSelector: ".item-card-handle"` を渡す。掴み手は検索絞り込み中と選択モード中は描画しない。
3. グループの縦リストは `handleSelector` を渡さないため、行のどこを押してもドラッグできる現在の
   挙動が変わらない（spec FR-014）。

技術アプローチ: 新規ファイルなし。storage層は変更しない。`dragReorder` の `handleDown` に
1つ分岐を足し、`pending` に「ドラッグを開始できる操作か」のフラグを持たせる。既存の
`ignoreSelector`（ドラッグもタップも起こさない）とは役割が違うため、別のオプションとして足す。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。ノービルド

**Primary Dependencies**: なし（Vanilla JS）。DOM標準APIのみ

**Storage**: 変更なし

**Testing**: vitest。本featureで追加する純粋なロジックはない（`dragReorder` はDOM操作が中心で
既存specと同方針でユニットテスト対象外）。**既存の166テストに回帰がないことを確認する**。
振る舞いは `quickstart.md` の手動検証で担保する

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）

**Project Type**: browser-extension（単一プロジェクト構成）

**Performance Goals**: 本featureに固有の性能目標はない

**Constraints**: **掴み手の追加でカードの高さを変えない**（`dragReorder` は行の高さを計測して
挿入位置を求めるため。spec FR-004 / SC-006）。掴み手をフォーカスの対象にしない（spec FR-005）。
グループの縦リストの挙動を変えない（spec FR-014 / SC-008）。キーボードによる並び替えを変えない
（spec FR-013 / SC-007）

**Scale/Scope**: User Story 2件（いずれもP1）、FR 14件、SC 8件。新規ファイルなし・既存ファイル変更3件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000013 が `status: approved`（PR #45 マージ済み） |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力および spec.md 冒頭「Reqord要件要約」に req-000013 のID・内容要約を明記 |
| Reqord運用ルール: Issue化はReqord側のみ | 該当なし(Phase時点) | `/speckit-taskstoissues` を使わない |
| Reqord運用ルール: 仕様変更時は実装停止 | **確認済み** | 本featureは spec 003 FR-001 のドラッグの受付範囲を狭める。この変更は req-000013 として起票・承認済みであり、実装中に発生した想定外の逸脱ではない |

違反なし。Complexity Trackingの記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/009-item-reorder-handle/
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
│   ├── dragReorder.js         # 変更: handleSelector オプションを追加
│   ├── sidepanel.js           # 変更: カードに .item-card-handle を追加、handleSelector を渡す
│   ├── sidepanel.css          # 変更: .item-card-handle のスタイルを追加
│   ├── groupPanel.js          # 変更なし（handleSelector を渡さないので挙動が変わらない）
│   ├── listReorder.js         # 変更なし
│   ├── focusTrap.js           # 変更なし
│   ├── itemFilter.js          # 変更なし
│   └── maskDisplay.js         # 変更なし
└── storage/                   # 変更なし

specs/009-item-reorder-handle/contracts/
└── drag-handle-contract.md    # dragReorder への handleSelector 追加の契約

specs/006-group-navigation/contracts/drag-reorder-contract.md
                               # 変更: handleSelector を Options に追記

README.md                      # 変更: 項目の並び替えの起点が掴み手であることを追記
```

**Structure Decision**: 新規ファイルを作らない。`dragReorder` は既に「ポインタ操作の扱い」という
関心を1ファイルに閉じ込めているため、ドラッグ開始の条件を1つ増やすのは同じファイルの中の
自然な拡張になる。カードとグループの縦リストで別の仕組みを持たないことは spec の Assumptions で
定めた方針でもある。

## Constitution Check（Phase 1設計後の再評価）

`research.md` / `contracts/` / `quickstart.md` 生成後も違反なし。storage層を変更せず、
technical.yaml の既定decision（Vanilla JS、ノービルド）と整合している。`dragReorder` の
オプションが1つ増えるが、既存の呼び出し側（グループの縦リスト）は指定しなければ従来どおり動く
後方互換の追加であり、複雑性の正当化は不要。

## Complexity Tracking

*Constitution Checkに違反なし。本セクションの記入は不要。*
