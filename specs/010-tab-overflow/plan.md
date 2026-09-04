# Implementation Plan: タブバーの横スクロール廃止と幅追従表示

**Branch**: `feature/req-000014`（spec ディレクトリ: `010-tab-overflow`） | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-tab-overflow/spec.md`

## Summary

1. `.tabs` の `overflow-x: auto` を `overflow: hidden` に変える。`.tab-panel-open` の
   `position: sticky` は不要になるので外す（隠れることがなくなるため）。
2. `renderTabs()` の描画後に、**タブの実測幅で表示可否を決める**処理を追加する。
   並び順の先頭から幅を積み上げ、末尾のボタンの幅を差し引いた残り幅に収まるところまでを表示し、
   収まらないタブは `hidden` にする。選択中のタブは必ず表示に含める。
3. `ResizeObserver` でタブバーの幅の変化を監視し、変わったら表示可否だけを再計算する
   （タブのDOMを作り直さない）。

技術アプローチ: 新規ファイルなし。storage層は変更しない。表示可否の判定は
**幅の配列と選択中の位置から表示するインデックスの集合を返す純関数**として
`src/sidepanel/tabOverflow.js` に切り出し、ユニットテスト対象にする。DOMの計測と
`hidden` の付け外しは `sidepanel.js` が担う。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。ノービルド

**Primary Dependencies**: なし（Vanilla JS）。DOM標準API（`getBoundingClientRect` /
`ResizeObserver`）のみ

**Storage**: 変更なし。どのタブを表示するかは保存しない（spec Key Entities）

**Testing**: vitest。**表示するタブを決めるロジックを純関数に切り出してユニットテスト対象にする**
（境界の条件が多く、手動検証だけでは網羅しにくい）。DOMの計測・`hidden` の付け外し・
`ResizeObserver` の配線はDOM操作が中心のため、既存specと同方針でユニットテスト対象外とし、
`quickstart.md` の手動検証で担保する

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）。サイドパネルは利用者が幅を変えられる

**Project Type**: browser-extension（単一プロジェクト構成）

**Performance Goals**: 幅の変化への追従が体感で遅れないこと。`ResizeObserver` の通知ごとに
タブのDOMを作り直さず、既に描画済みの要素の `hidden` を切り替えるだけにする

**Constraints**: 横スクロールを発生させない（spec FR-001 / SC-001）。選択中のタブを必ず表示する
（spec FR-005 / SC-004）。末尾のボタンを常に表示する（spec FR-006 / SC-005）。隠れたタブを
キーボードのフォーカス対象にしない（spec FR-013 / SC-006）。タブ名の末尾省略と並び順は変更しない

**Scale/Scope**: User Story 3件（いずれもP1）、FR 14件、SC 8件。新規ファイル1件・既存ファイル変更2件・
新規テストファイル1件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000014 が `status: approved`（PR #47 マージ済み） |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力および spec.md 冒頭「Reqord要件要約」に req-000014 のID・内容要約を明記 |
| Reqord運用ルール: Issue化はReqord側のみ | 該当なし(Phase時点) | `/speckit-taskstoissues` を使わない |
| Reqord運用ルール: 仕様変更時は実装停止 | **確認済み** | 本featureは spec 006 のタブバーの表示方式を変更する。この変更は req-000014 として起票・承認済みであり、実装中に発生した想定外の逸脱ではない |

違反なし。Complexity Trackingの記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/010-tab-overflow/
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
│   ├── tabOverflow.js         # 新規: 表示するタブを決める純関数（DOM非依存）
│   ├── sidepanel.js           # 変更: renderTabs 後に表示可否を適用、ResizeObserver を配線
│   ├── sidepanel.css          # 変更: .tabs の overflow-x: auto を hidden に、
│   │                           # .tab-panel-open の position: sticky を撤去
│   ├── groupPanel.js          # 変更なし
│   ├── dragReorder.js         # 変更なし
│   ├── listReorder.js         # 変更なし
│   ├── focusTrap.js           # 変更なし
│   ├── itemFilter.js          # 変更なし
│   └── maskDisplay.js         # 変更なし
└── storage/                   # 変更なし

tests/
└── unit/
    └── tabOverflow.test.js    # 新規: visibleTabIndexes の境界条件

README.md                      # 変更: タブバーの表示方式の記述を更新
```

**Structure Decision**: 表示するタブを決めるロジックを `tabOverflow.js` に純関数として切り出す。
理由は境界の条件が多いこと。

- 全部収まる / 一部だけ収まる / 1つも収まらない
- 選択中のタブがそのまま収まる / 収まらない位置にある
- 選択中のタブを表示するために他を隠す必要がある

これらを `quickstart.md` の手動検証だけで網羅するのは現実的でない。幅の配列と選択中の位置を
入力にして表示するインデックスの集合を返す形にすれば、`chrome` API にもDOMにも依存せず
ユニットテストで全条件を確認できる。`006-group-navigation` で `tabOrder` の正規化を、
`007-sidepanel-keyboard` で並び順の組み替えを純関数に切り出したのと同じ方針。

## Constitution Check（Phase 1設計後の再評価）

`research.md` / `contracts/` / `quickstart.md` 生成後も違反なし。storage層を変更せず、
technical.yaml の既定decision（Vanilla JS、ノービルド、vitest + chrome API mock）と整合している。
新規ファイル1件は「判定ロジックをテスト可能にする」ための分離であり、既存の方針の踏襲。
Complexity Tracking の記入は不要。

## Complexity Tracking

*Constitution Checkに違反なし。本セクションの記入は不要。*
