# Implementation Plan: 選択項目グループ一括変更・選択モード中の個別操作制限

**Branch**: `005-bulk-group-change` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-bulk-group-change/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

既存のサイドパネル選択モード(`003-sidepanel-list-enhancements`で実装済みの一括削除機能)を拡張する。
(1) 選択モードが有効な間、各カードのコピーボタン・三点リーダーボタンを無効化し、選択モード開始時に
開いていた個別メニューは自動的に閉じる。(2) 選択ツールバーに「グループ変更」操作を追加し、既存の
グループ一覧(未分類を含む)から変更先を選んで確定すると、選択中の全項目のグループを一括更新する。
技術アプローチ: `itemRepository.js`に`removeMany()`と対になる`updateGroupMany(ids, groupId)`を追加し
1回の`setItem`書き込みで一括更新する。UI側は`sidepanel.js`の`selectionMode`分岐にコピー/三点リーダー
無効化ロジックを追加し、選択ツールバーに「グループ変更」ボタンとグループ選択用の簡易ポップオーバーを
追加する。UI層(`src/sidepanel/`)・データ層(`src/storage/`)とも既存構成を維持し、ロジックのみ拡張する。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。TypeScriptやトランスパイルは行わない
（既存specの踏襲、ノービルド方針）

**Primary Dependencies**: なし（Vanilla JS）。Chrome Extension APIs（`chrome.storage`）のみを使用

**Storage**: `chrome.storage.local`（キー: `items` / `groups` / `settings`）。既存の
`itemRepository.js`を拡張する（`updateGroupMany()`を追加。既存関数のシグネチャ・既存フィールドの
意味は変更しない）

**Testing**: vitest + `chrome.storage.local`のmock（既存`tests/unit/chromeMock.js`を再利用）。
`updateGroupMany()`はDOM非依存のRepository層関数としてユニットテスト対象とする。選択モード中の
コピー/三点リーダー無効化、グループ変更ポップオーバーのUI挙動は既存のsidepanel.js同様に自動テスト
対象外とし、`quickstart.md`の手動検証シナリオで確認する（既存specでもUI層のDOM操作はユニットテスト
対象外という前例を踏襲）

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）。既存の常駐サイドパネル
（`src/sidepanel/sidepanel.html`）に機能追加する

**Project Type**: browser-extension（単一プロジェクト構成。frontend/backend分割なし）

**Performance Goals**: 選択モード中は100%のカードでコピー・三点リーダー操作が無効化される(SC-001)、
グループ一括変更操作から一覧反映まで1秒以内(SC-002)、選択項目の100%のグループが変更され未選択項目は
0件も変更されない(SC-003)

**Constraints**: ノービルド配布、既存の登録上限500件・グループ上限50件・文字数制限は変更なし、
既存storage層のAPI（既存関数シグネチャ）は変更不可、既存の選択モード開始操作・チェックボックスUI・
一括削除・選択状態リセット(タブ切替/検索時)の挙動は変更しない

**Scale/Scope**: User Story 2件（P1, P2）、FR 11件（FR-002a含む）、SC 5件。個人〜複数ユーザーが
各自の端末で利用する規模（同時多接続やサーバー側スケールは対象外）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000009 が `status: approved` |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力および spec.md冒頭「Reqord要件要約」に req-000009 のID・内容要約を明記 |
| Reqord運用ルール: Issue化はReqord側のみ | 該当なし(Phase時点) | `/speckit-tasks` 以降で `/speckit-taskstoissues` を使わないことを遵守予定 |
| Reqord運用ルール: 仕様変更時は実装停止 | 該当なし(Phase時点) | 実装フェーズでの運用ルールとして継続適用 |

違反なし。Complexity Trackingの記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/005-bulk-group-change/
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
├── sidepanel/                # UI層（既存・機能追加）
│   ├── sidepanel.html         # 選択ツールバーに「グループ変更」ボタン＋グループ選択ポップオーバーを追加
│   ├── sidepanel.css          # 選択モード中のコピー/三点リーダー無効化スタイル、グループ選択ポップオーバーのスタイルを追加
│   ├── sidepanel.js           # 選択モード中のコピー/三点リーダー無効化、既存メニューの自動クローズ、
│   │                           # グループ変更ポップオーバーの開閉・確定・キャンセルのロジックを追加
│   ├── itemFilter.js          # 変更なし
│   └── maskDisplay.js         # 変更なし
├── background/                # 変更なし
└── storage/                   # データ層（既存・関数追加のみ）
    ├── itemRepository.js       # updateGroupMany(ids, groupId) を追加
    ├── groupRepository.js      # 変更なし（既存list()を変更先グループ一覧の取得に再利用）
    ├── settingsRepository.js   # 変更なし
    ├── storageClient.js        # 変更なし
    └── errors.js               # 変更なし

tests/
└── unit/
    ├── itemRepository.test.js     # 既存 + updateGroupMany()のテストを追加
    ├── groupRepository.test.js    # 変更なし
    ├── settingsRepository.test.js # 変更なし
    ├── maskDisplay.test.js        # 変更なし
    └── itemFilter.test.js         # 変更なし
```

**Structure Decision**: 既存の「UI層(`sidepanel/`)／データ層(`storage/`)」2層構成を維持し、新規
ディレクトリ・新規UIページは作らず、既存ファイルへの関数追加・ロジック追加のみで実現する単一プロジェクト
構成。グループ一括変更は`itemRepository.js`に`removeMany()`と対になる`updateGroupMany()`を追加して
実現し、新規ストレージキー・新規フィールドの追加は行わない（既存の`items[].groupId`をそのまま対象と
する）。

## Constitution Check（Phase 1設計後の再評価）

`research.md` / `data-model.md` / `contracts/` / `quickstart.md` 生成後も、原則I・IIおよび
Reqord運用ルールへの違反なし。既存storage層のRepositoryパターンに関数を追加する形であり、
technical.yamlの既定decision（Repositoryパターン採用）との整合を維持している。新たな複雑性の
正当化（Complexity Tracking記入）は不要。

## Complexity Tracking

*Constitution Checkに違反なし。本セクションの記入は不要。*
