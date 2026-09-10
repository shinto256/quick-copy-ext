# Implementation Plan: グループ選択状態の復元

**Branch**: `feature/req-000016`（spec ディレクトリ: `012-restore-last-group`） | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-restore-last-group/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

サイドパネルを開いた際のグループ選択状態を、並べ替え順の先頭固定から「最後に選択していたグループ」の
復元へ変更する。技術アプローチ: 既存の `settingsRepository.js`（`chrome.storage.local` の `settings`
キー）に `selectedGroupId` フィールドを追加し、ユーザーがタブ（未分類タブを含む）を選択するたびに
永続化する。`sidepanel.js` の `init()` は、現状の `tabOrder[0]` 固定初期化を、保存済み
`selectedGroupId` が現在の `tabOrder` に存在すればそれを優先し、存在しない・未設定の場合のみ
`tabOrder[0]` にフォールバックする分岐へ変更する。新規ファイルは作成せず、既存2ファイルの変更のみで
完結する。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。TypeScriptやトランスパイルは行わない
（既存specの踏襲、ノービルド方針）

**Primary Dependencies**: なし（Vanilla JS）。Chrome Extension APIs（`chrome.storage.local`）のみ

**Storage**: `chrome.storage.local`。既存キー `settings` に **新規フィールド `selectedGroupId`
（`string | null`）を追加**する。`groups` / `tabOrder` キーのスキーマは変更しない

**Testing**: vitest + `chrome.storage.local` のmock（既存 `tests/unit/chromeMock.js` を再利用）。
`settingsRepository.js` への追加関数はユニットテスト対象。`sidepanel.js` の `init()` 分岐は既存specと
同方針でユニットテスト対象外とし、`quickstart.md` の手動検証シナリオで担保する

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）。既存の常駐サイドパネル
（`src/sidepanel/sidepanel.html`）に機能追加する

**Project Type**: browser-extension（単一プロジェクト構成。frontend/backend分割なし）

**Performance Goals**: 選択状態の保存はタブクリック操作へ体感遅延を生じさせない（既存の
`chrome.storage.local` 書き込みと同等の非同期I/O、UIブロッキングなし）

**Constraints**: ノービルド配布、既存storage層の関数シグネチャは変更不可（`settingsRepository` は
関数追加のみ）、既存の項目登録・コピー・マスク表示・並べ替え・全グループパネル等の挙動は変更しない

**Scale/Scope**: User Story 3件（P1〜P3）、FR 5件、SC 3件。既存ファイル変更2件
（`settingsRepository.js` / `sidepanel.js`）。新規ファイルなし

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000016 が `status: approved`（PR #54 マージ済み） |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力に req-000016 のID・内容要約を明記 |
| Reqord運用ルール: Issue化はReqord側のみ | 該当なし(Phase時点) | `/speckit-tasks` 以降で `/speckit-taskstoissues` を使わないことを遵守予定 |
| Reqord運用ルール: 仕様変更時は実装停止 | 該当なし(Phase時点) | 実装フェーズでの運用ルールとして継続適用 |

違反なし。Complexity Trackingの記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/012-restore-last-group/
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
├── sidepanel/                     # UI層
│   └── sidepanel.js                # init() の初期選択ロジックを変更。selectTab() で選択状態を永続化
├── storage/                        # データ層
│   └── settingsRepository.js       # selectedGroupId フィールドの読み書き関数を追加
├── background/                     # 変更なし
└── options/                        # 変更なし

tests/
└── unit/
    └── settingsRepository.test.js   # 既存テストに selectedGroupId のケースを追加（新規ファイルなら追加）
```

**Structure Decision**: 既存の2層構成（UI層 `src/sidepanel/` / データ層 `src/storage/`）を維持する。
選択状態は `maskEnabled` / `theme` / `language` と同じ性質の「軽量なUI設定値」であるため、専用の新規
storage keyやRepositoryを新設せず、既存 `settingsRepository.js` の `settings` キーへフィールド追加する
形で拡張する。

## Constitution Check（Phase 1設計後の再評価）

`research.md` / `data-model.md` / `contracts/` / `quickstart.md` 生成後も、原則I・IIおよび
Reqord運用ルールへの違反なし。データアクセスは既存のRepositoryパターンを維持し
（`settingsRepository` に関数追加のみ）、technical.yaml の既定decision（Repositoryパターン採用、
Vanilla JS、ノービルド、vitest + chrome API mock）すべてと整合している。新規ファイル・新規依存関係を
追加しないため、新たな複雑性の正当化（Complexity Tracking記入）は不要。

## Complexity Tracking

*Constitution Checkに違反なし。本セクションの記入は不要。*
