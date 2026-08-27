# Implementation Plan: クイックコピー登録・管理機能

**Branch**: `001-quick-copy-items` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-quick-copy-items/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

フォーム入力で繰り返し使う定型文字列（名前＋値、複数行可）を登録し、一覧からワンクリックで
コピーできるChrome/Edge拡張機能。値はデフォルトでマスク表示し、切替可能。項目はグループで
整理できる。技術アプローチ: Manifest V3、Vanilla JS/HTML/CSS(ノービルド)、Repositoryパターン
によるchrome.storage.localアクセス、vitestによるユニットテスト（Reqord spec-000001〜000004・
technical.yamlの決定事項に準拠）。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。TypeScriptやトランスパイルは行わない

**Primary Dependencies**: なし（Vanilla JS）。Chrome Extension APIs（`chrome.storage`、
`navigator.clipboard`）のみを使用

**Storage**: `chrome.storage.local`（キー: `items` / `groups` / `settings`）

**Testing**: vitest + `chrome.storage.local` / `navigator.clipboard` のmock

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）。popup / options の2つの拡張ページ

**Project Type**: browser-extension（単一プロジェクト構成。frontend/backend分割なし）

**Performance Goals**: 保存→一覧反映 1秒以内(SC-001)、コピー→クリップボード反映 100ms以内(SC-005)、
マスク切替→画面反映 200ms以内(SC-007)、グループ絞り込み→再表示 300ms以内(SC-009)

**Constraints**: ノービルド配布（zip化してストア申請）、登録上限500件・グループ上限50件、
名前1〜50文字・値1〜2000文字（複数行可）・グループ名1〜30文字、データは端末ローカル保存のみ
（同期なし）

**Scale/Scope**: User Story 4件（P1〜P4）、FR 15件、SC 10件。個人〜複数ユーザーが各自の端末で
利用する規模（同時多接続やサーバー側スケールは対象外）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000001〜004、spec-000001〜004 すべて `status: approved`（PR merge済み） |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力に req-000001〜004 のID・内容要約を明記（spec.md冒頭 Input参照） |
| Reqord運用ルール: Issue化はReqord側のみ | 該当なし(Phase時点) | `/speckit-tasks` 以降で `/speckit-taskstoissues` を使わないことを遵守予定 |
| Reqord運用ルール: 仕様変更時は実装停止 | 該当なし(Phase時点) | 実装フェーズでの運用ルールとして継続適用 |

違反なし。Complexity Trackingの記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
manifest.json             # Manifest V3 定義

src/
├── popup/                 # UI層: 一覧表示・コピー・マスク切替・グループ絞り込み
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/                # UI層: 項目登録・編集・削除、グループ作成・編集・削除
│   ├── options.html
│   ├── options.css
│   └── options.js
└── storage/                # データ層: Repositoryパターン(chrome.storage.localアクセスを集約)
    ├── itemRepository.js
    ├── groupRepository.js
    └── settingsRepository.js

tests/
└── unit/
    ├── itemRepository.test.js
    ├── groupRepository.test.js
    └── settingsRepository.test.js

icons/                     # ストア申請用アイコン
```

**Structure Decision**: structure.yaml（Reqordプロジェクトコンテキスト）が定めるUI層
（popup / options）とデータ層（storage）の2層構成をそのままソースツリーに反映した単一
プロジェクト構成とする。frontend/backend分割やAPIサーバーは存在しないため該当なし。
`storage/` 配下のRepositoryはUI層(popup/options)から一方向にのみ依存される
（technical.yamlのdecisionに準拠）。

## Constitution Check（Phase 1設計後の再評価）

data-model.md / contracts/ / quickstart.md 生成後も、原則I・IIおよびReqord運用ルールへの
違反なし。Repositoryパターン（原則違反ではなく technical.yaml の既定decisionそのもの）を
含め、設計はすべてReqordのspec-000001〜000004design.mdと整合している。

## Complexity Tracking

*Constitution Checkに違反なし。本セクションの記入は不要。*
