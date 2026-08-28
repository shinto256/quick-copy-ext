# Implementation Plan: サイドパネルUI刷新

**Branch**: `002-side-panel-ui` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-side-panel-ui/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

現行のaction popup（`src/popup/`）と別画面のoptions（`src/options/`）を廃止し、Chrome拡張の
サイドパネルAPIを用いた常駐UI（`src/sidepanel/`）へ統合する。UIはグループをタブとして表示し、
各タブ内で項目をカード形式（名前＋マスク対応値＋コピー＋編集/削除）で一覧表示する。項目登録・
編集、グループ作成・編集・削除は同一パネル内のインラインUI（画面遷移なし）で完結させる。
ヘッダーには常時表示のマスク切替トグルと検索欄を配置する（タブ切替時に検索はリセット）。
既存のデータ層（`src/storage/` のRepositoryパターン、req-000001〜004準拠）はロジック変更なしで
再利用する。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。TypeScriptやトランスパイルは行わない
（001-quick-copy-itemsのノービルド方針を踏襲）

**Primary Dependencies**: なし（Vanilla JS）。Chrome Extension APIs（`chrome.storage`、
`navigator.clipboard`、`chrome.sidePanel`、`chrome.runtime`）のみを使用

**Storage**: `chrome.storage.local`（キー: `items` / `groups` / `settings`）。001で実装済みの
`itemRepository.js` / `groupRepository.js` / `settingsRepository.js` をロジック変更なしで再利用

**Testing**: vitest + `chrome.storage.local` / `navigator.clipboard` のmock（既存 `tests/unit/chromeMock.js`
を再利用）。新規UIロジックはDOM非依存の純粋関数として切り出しユニットテスト対象とする

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）。UIページは常駐サイドパネル1つに統合
（`chrome.sidePanel` API、Chrome 114+ 相当）

**Project Type**: browser-extension（単一プロジェクト構成。frontend/backend分割なし）

**Performance Goals**: 既存SC（コピー→クリップボード反映100ms以内、マスク切替→画面反映200ms以内、
グループ絞り込み→再表示300ms以内）を維持。追加SC: パネル表示までの操作数1回、項目登録・
グループ管理の画面遷移回数0回、検索入力→一覧再描画150ms以内（SC-006）

**Constraints**: ノービルド配布（zip化してストア申請）、登録上限500件・グループ上限50件、
名前1〜50文字・値1〜2000文字（複数行可）・グループ名1〜30文字、データは端末ローカル保存のみ
（同期なし）、既存storage層のAPI（関数シグネチャ）は変更不可（001のcontracts/を破壊しない）

**Scale/Scope**: User Story 4件（P1×2、P2、P3）、FR 13件、SC 6件。個人〜複数ユーザーが各自の
端末で利用する規模（同時多接続やサーバー側スケールは対象外）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000001〜004 すべて `status: approved`。本specはUI形態刷新のみでビジネスルールは変更しない |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力および spec.md冒頭「Reqord要件要約」に req-000001〜004 のID・内容要約を明記 |
| Reqord運用ルール: Issue化はReqord側のみ | 該当なし(Phase時点) | `/speckit-tasks` 以降で `/speckit-taskstoissues` を使わないことを遵守予定 |
| Reqord運用ルール: 仕様変更時は実装停止 | 該当なし(Phase時点) | 実装フェーズでの運用ルールとして継続適用 |

違反なし。Complexity Trackingの記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/002-side-panel-ui/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
manifest.json              # Manifest V3 定義（side_panel/background/permissions を更新）

src/
├── sidepanel/              # UI層（新規・popup/optionsを統合置換）
│   ├── sidepanel.html       # タブ(グループ)+カード一覧+ヘッダー(検索/マスク切替/追加)
│   ├── sidepanel.css
│   ├── sidepanel.js         # DOM組み立て・イベント配線
│   ├── itemFilter.js        # 純粋関数: グループ絞り込み+名前検索（ユニットテスト対象）
│   └── maskDisplay.js       # 001の src/popup/maskDisplay.js をSetup時に移設（内容変更なし）
├── background/              # 新規: サイドパネルをアクションクリックで開くための設定
│   └── background.js
├── popup/                   # 削除予定（本specの実装フェーズでtasks.md化し撤去）
├── options/                 # 削除予定（同上）
└── storage/                 # データ層（変更なし・そのまま再利用）
    ├── itemRepository.js
    ├── groupRepository.js
    ├── settingsRepository.js
    ├── storageClient.js
    └── errors.js

tests/
└── unit/
    ├── itemFilter.test.js    # 新規: タブ絞り込み+検索のユニットテスト
    ├── itemRepository.test.js
    ├── groupRepository.test.js
    ├── settingsRepository.test.js
    └── maskDisplay.test.js

icons/                      # ストア申請用アイコン（変更なし）
```

**Structure Decision**: 001と同じ「UI層／データ層」2層構成を維持しつつ、UI層を
`popup/` + `options/` の2ページ構成から常駐 `sidepanel/` 1ページ構成へ統合する
単一プロジェクト構成。`background/` はサイドパネルをアクションクリックで開閉する
ためだけの薄い設定用スクリプトであり、業務ロジックは持たない（Reqord技術的制約
「storage層はUI層から一方向にのみ依存される」は維持）。`popup/` `options/` は
tasks.md側で撤去対象として扱う。

## Constitution Check（Phase 1設計後の再評価）

`research.md` / `data-model.md` / `contracts/` / `quickstart.md` 生成後も、原則I・IIおよび
Reqord運用ルールへの違反なし。`background/` の新設・storage層の再利用方針はいずれも
technical.yamlの既定decision（Repositoryパターン、UI層からの一方向依存）と整合しており、
新たな複雑性の正当化（Complexity Tracking記入）は不要。

## Complexity Tracking

*Constitution Checkに違反なし。本セクションの記入は不要。*
