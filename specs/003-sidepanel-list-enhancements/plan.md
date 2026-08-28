# Implementation Plan: サイドパネル一覧機能拡張(並び替え・テーマ手動切替・一括削除)

**Branch**: `003-sidepanel-list-enhancements` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-sidepanel-list-enhancements/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

既存のサイドパネルUI(`002-side-panel-ui`)に3つの機能を追加する: (1) 選択中タブ内での項目の
手動並び替え(ドラッグ&ドロップ＋カードメニューの上下移動、新規項目は末尾追加)、(2) テーマの
手動固定(自動/ライト固定/ダーク固定、既存の`prefers-color-scheme`自動追従はそのまま維持)、
(3) 選択モードによる複数項目の一括削除(明示的なキャンセル操作あり)。技術アプローチ: 並び替えは
`items`配列内での相対位置の入れ替えとして実装し新規フィールドを追加しない、テーマは`settings`に
`theme`フィールドを追加しCSSカスタムプロパティ+`data-theme`属性で制御、一括削除は
`ItemRepository`に一括削除用の新関数を追加する。UI層(`src/sidepanel/`)・データ層
(`src/storage/`)とも既存構成を維持し、ロジックのみ拡張する。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。TypeScriptやトランスパイルは行わない
（001・002のノービルド方針を踏襲）

**Primary Dependencies**: なし（Vanilla JS）。Chrome Extension APIs（`chrome.storage`、
`navigator.clipboard`、HTML Drag and Drop API）のみを使用

**Storage**: `chrome.storage.local`（キー: `items` / `groups` / `settings`）。既存の
`itemRepository.js` / `groupRepository.js` / `settingsRepository.js` を拡張する
（関数追加のみ。既存関数のシグネチャ・既存フィールドの意味は変更しない）

**Testing**: vitest + `chrome.storage.local` のmock（既存 `tests/unit/chromeMock.js` を再利用）。
並び替えロジック・削除ロジックはDOM非依存のRepository層関数としてユニットテスト対象とする

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）。既存の常駐サイドパネル
（`src/sidepanel/sidepanel.html`）に機能追加する

**Project Type**: browser-extension（単一プロジェクト構成。frontend/backend分割なし）

**Performance Goals**: 並び替え操作から一覧反映まで1操作で完結(SC-001)、並び順・テーマ設定は
再起動後も100%維持(SC-002, SC-004)、テーマ切替は200ms以内に反映(SC-003)、一括削除は選択項目の
100%を削除し未選択項目は0件も削除しない(SC-006)

**Constraints**: ノービルド配布、既存の登録上限500件・グループ上限50件・文字数制限は変更なし、
既存storage層のAPI（既存関数シグネチャ）は変更不可（001・002のcontracts/を破壊しない）、
並び替え・一括削除は検索絞り込み中は無効

**Scale/Scope**: User Story 3件（P1, P2, P3）、FR 16件、SC 6件。個人〜複数ユーザーが各自の端末で
利用する規模（同時多接続やサーバー側スケールは対象外）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000005〜007 すべて `status: approved` |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力および spec.md冒頭「Reqord要件要約」に req-000005〜007 のID・内容要約を明記 |
| Reqord運用ルール: Issue化はReqord側のみ | 該当なし(Phase時点) | `/speckit-tasks` 以降で `/speckit-taskstoissues` を使わないことを遵守予定 |
| Reqord運用ルール: 仕様変更時は実装停止 | 該当なし(Phase時点) | 実装フェーズでの運用ルールとして継続適用 |

違反なし。Complexity Trackingの記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/003-sidepanel-list-enhancements/
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
├── sidepanel/               # UI層（既存・機能追加）
│   ├── sidepanel.html        # ヘッダーに「その他メニュー」(テーマ設定/選択モード開始)を追加
│   ├── sidepanel.css         # data-theme属性によるテーマ手動固定用スタイルを追加
│   ├── sidepanel.js          # 並び替え(D&D/上下移動)・選択モード・一括削除のUIロジックを追加
│   ├── itemFilter.js         # 変更なし（既存のタブ+検索絞り込み）
│   └── maskDisplay.js        # 変更なし
├── background/               # 変更なし
└── storage/                  # データ層（既存・関数追加のみ）
    ├── itemRepository.js      # reorderGroup() / removeMany() を追加
    ├── groupRepository.js     # 変更なし
    ├── settingsRepository.js  # setTheme() を追加（settingsに theme フィールド追加）
    ├── storageClient.js       # 変更なし
    └── errors.js              # 変更なし

tests/
└── unit/
    ├── itemRepository.test.js     # 既存 + reorderGroup()/removeMany()のテストを追加
    ├── settingsRepository.test.js # 既存 + setTheme()のテストを追加
    ├── groupRepository.test.js    # 変更なし
    ├── maskDisplay.test.js        # 変更なし
    └── itemFilter.test.js         # 変更なし
```

**Structure Decision**: 002-side-panel-uiと同じ「UI層(`sidepanel/`)／データ層(`storage/`)」
2層構成を維持し、新規ディレクトリ・新規UIページは作らず、既存ファイルへの関数追加・ロジック
追加のみで実現する単一プロジェクト構成。並び替えは`items`配列の相対位置操作として実装し、
新規ストレージキーやフィールドは`settings.theme`のみ追加する（`items`側はフィールド追加なし、
配列内の並び順自体をデータとして扱う）。

## Constitution Check（Phase 1設計後の再評価）

`research.md` / `data-model.md` / `contracts/` / `quickstart.md` 生成後も、原則I・IIおよび
Reqord運用ルールへの違反なし。既存storage層のRepositoryパターンに関数を追加する形であり、
technical.yamlの既定decisionとの整合を維持している。新たな複雑性の正当化（Complexity Tracking
記入）は不要。

## Complexity Tracking

*Constitution Checkに違反なし。本セクションの記入は不要。*
