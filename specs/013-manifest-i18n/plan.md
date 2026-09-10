# Implementation Plan: 拡張機能名・説明の多言語対応

**Branch**: `feature/req-000017`（spec ディレクトリ: `013-manifest-i18n`） | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-manifest-i18n/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

拡張機能の名称と説明を、ブラウザの表示言語に応じて日本語・英語で切り替える。技術アプローチ:
`_locales/ja/messages.json` と `_locales/en/messages.json` に `extName` / `extDescription` の2キーを
定義し、`manifest.json` の `name` と `description` を `__MSG_extName__` / `__MSG_extDescription__` へ
置き換えたうえで `default_locale: "ja"` を追加する。サイドパネル内の表示文字列を担う既存の
`src/i18n/` には一切手を入れない。ブラウザの表示言語（`_locales` が担当）と利用者が選ぶ表示言語
（`src/i18n/` が担当）は決定方法が異なるため、別系統として併存させる。あわせて `manifest.json` と
`_locales` の整合を検証するユニットテストを追加し、読み込み失敗と説明文の長さ超過を機械的に防ぐ。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。TypeScriptやトランスパイルは行わない
（既存specの踏襲、ノービルド方針）。本要件の成果物の実体は JSON 2ファイルと manifest の変更

**Primary Dependencies**: なし（Vanilla JS）。Chrome Extension の i18n 機構（`_locales` +
`default_locale`）を使うが、**権限追加は不要**。`chrome.i18n` API をコードから呼び出す箇所は作らない
（manifest の `__MSG_*__` 解決はブラウザが行う）

**Storage**: 変更なし。`chrome.storage.local` の既存キー（`items` / `groups` / `tabOrder` / `settings`）の
スキーマには一切手を入れない。本要件は永続データを扱わない

**Testing**: vitest。新規に `tests/unit/localeMessages.test.js` を追加し、`manifest.json` と
`_locales/*/messages.json` をファイルとして読み込んで整合を検証する（`chrome.storage.local` のmockは
不要）。ブラウザの表示言語に依存する表示の確認は `quickstart.md` の手動検証シナリオで担保する

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）。ブラウザの表示言語は OS/ブラウザ設定で
決まり、拡張機能から変更できない

**Project Type**: browser-extension（単一プロジェクト構成。frontend/backend分割なし）

**Performance Goals**: 該当なし。`__MSG_*__` の解決は拡張機能の読み込み時にブラウザが1回行うもので、
実行時のオーバーヘッドを持たない

**Constraints**: ノービルド配布。`src/i18n/` の実装・関数シグネチャは変更不可。`default_locale` の
`messages.json` は全キーの値を持たなければならない（欠けると拡張機能が読み込めない）。
`extDescription` は各ロケールで132文字以内（FR-009）。既存の項目登録・コピー・マスク表示・並べ替え・
全グループパネル・言語切替の挙動は変更しない

**Scale/Scope**: User Story 3件（P1〜P3）、FR 9件、SC 9件。新規ファイル3件
（`_locales/ja/messages.json` / `_locales/en/messages.json` / `tests/unit/localeMessages.test.js`）、
既存ファイル変更1件（`manifest.json`）。`src/` 配下の変更は0件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000017 が `status: approved`（PR #57 マージ済み） |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力に req-000017 のID・内容要約を明記。spec に Traceability セクションを設置 |
| Reqord運用ルール: Issue化はReqord側のみ | 遵守予定 | `/speckit-taskstoissues` は使用しない。Issue化が必要になった場合は `reqord task create` / `reqord task sync` を使う |
| Reqord運用ルール: 仕様変更時は実装停止 | 該当なし(Phase時点) | 実装フェーズでの運用ルールとして継続適用 |

違反なし。Complexity Trackingの記入は不要。

### Phase 1 設計後の再評価

設計の結果、新規ファイルは JSON 2件とテスト1件、既存変更は `manifest.json` のみで、`src/` 配下への
変更は発生しない。仕様に対して追加の抽象化や新しい層を導入していないため、再評価後も違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/013-manifest-i18n/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── locale-messages-contract.md
├── checklists/
│   └── requirements.md  # /speckit-specify output
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
manifest.json                     # 変更: name / description を __MSG_*__ 参照へ、default_locale を追加

_locales/                         # 新規ディレクトリ
├── ja/
│   └── messages.json             # 新規: extName / extDescription（日本語）
└── en/
    └── messages.json             # 新規: extName / extDescription（英語）

src/                              # 変更なし
├── background/background.js
├── i18n/                         # サイドパネル内の表示言語。本要件では触らない
│   ├── en.js
│   ├── index.js
│   └── ja.js
├── sidepanel/
└── storage/

tests/
└── unit/
    └── localeMessages.test.js    # 新規: manifest と _locales の整合検証
```

**Structure Decision**: 単一プロジェクト構成を維持する。`_locales` はリポジトリ直下に置く必要がある
（Chrome が manifest と同じ階層の `_locales` を探索する）ため、`src/` 配下ではなくルートに配置する。
i18n の実装が `_locales/`（ブラウザ表示言語・manifest メタデータ専用）と `src/i18n/`（利用者選択・
サイドパネル内文字列）の2箇所に分かれるが、これは責務の分離であり重複ではない。両者の境界は
`contracts/locale-messages-contract.md` に明記する。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

違反なし。記入不要。
