# Implementation Plan: サイドパネルの多言語対応（日本語・英語）

**Branch**: `feature/req-000015`（spec ディレクトリ: `011-sidepanel-i18n`） | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-sidepanel-i18n/spec.md`

## Summary

サイドパネル内の全表示文字列を、キーで引く翻訳辞書（`src/i18n/ja.js` / `src/i18n/en.js`）に置き換える。

1. `src/i18n/index.js` に `t(key, params)` / `setLanguage(lang)` / `getLanguage()` を実装する。
2. 静的なHTML（`sidepanel.html`）のラベル・プレースホルダー・`aria-label`・`title`には
   `data-i18n-*` 属性を付け、`applyStaticTranslations(root)` が読み出しのたびに反映する。
3. 動的に生成される文字列（`sidepanel.js` / `groupPanel.js` が `createElement` で組み立てる部分）は、
   生成箇所で直接 `t(key, params)` を呼ぶ。これらは既存の再描画関数（`renderTabs` /
   `renderList` / `renderMoreMenu` / `groupPanel` 内の描画）が言語切替のたびに呼び直されるため、
   新しい仕組みを追加しなくても再描画で言語が反映される。
4. その他メニューに「言語」セクションを追加する。既存の「テーマ」セクション
   （`THEME_OPTIONS` / `renderMoreMenu`）と同じ構造で `LANGUAGE_OPTIONS` を作る。
5. `SettingsRepository` に `language`（`"ja"` | `"en"`、既定 `"ja"`）を追加する。
6. 項目登録フォームの検証エラー（`showItemError(error.message)`）を、`groupPanel.js` の
   `validationMessage` と同じ方針でフィールド別に翻訳文言へ変換する。

技術アプローチ: 新規ディレクトリ `src/i18n/` を追加する。storage層は `settingsRepository.js` の
1関数追加のみ。既存の描画関数を作り直さず、言語切替時にそれらを呼び直すことで対応する
（`006-group-navigation` のタブ再描画、`groupPanel` の `refresh` と同じ考え方）。

## Technical Context

**Language/Version**: JavaScript (ES2020+)、HTML/CSS。ノービルド

**Primary Dependencies**: なし（Vanilla JS）。国際化ライブラリは導入しない

**Storage**: `SettingsRepository` に `language` を追加する（既存の `settings` キーに同居。
新規ストレージキーは設けない。spec Key Entities）

**Testing**: vitest。**辞書のキー網羅性チェックと `t()` の展開ロジックを純関数としてユニットテスト
対象にする**（2つの辞書でキー集合が完全一致することを機械的に保証する）。DOMへの適用
（`applyStaticTranslations`、再描画関数の呼び直し）はDOM操作が中心のため、既存specと同方針で
ユニットテスト対象外とし、`quickstart.md` の手動検証で担保する

**Target Platform**: Chrome / Edge 拡張機能（Manifest V3）

**Project Type**: browser-extension（単一プロジェクト構成）

**Performance Goals**: 言語切替が体感で遅延なく反映されること。既存の再描画関数を呼び直すだけなので
新たな性能上の懸念はない

**Constraints**: 翻訳辞書は日本語・英語の2つ（spec FR-002）。言語切替時に開いているオーバーレイの
開閉状態・入力中の値・選択モードの選択状態を変えない（spec FR-014〜FR-016）。項目登録フォームの
検証エラーの内部識別文字列をそのまま表示しない（spec FR-017〜FR-018）。既存のポインタ操作・
キーボード操作・並び替え・ドラッグの挙動は変えない

**Scale/Scope**: User Story 3件（P1×2、P2×1）、FR 19件、SC 6件。新規ファイル4件
（`src/i18n/index.js` / `ja.js` / `en.js` + テスト1件）・既存ファイル変更5件
（`sidepanel.html` / `sidepanel.js` / `groupPanel.js` / `settingsRepository.js` / `sidepanel.css`）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ゲート | 状態 | 根拠 |
|--------|------|------|
| 原則I: Reqord承認必須 | PASS | req-000015 が `status: approved`（v1.1、PR #51 マージ済み） |
| 原則II: 要件のSpec入力への反映 | PASS | `/speckit-specify` の入力および spec.md 冒頭「Reqord要件要約」に req-000015 のID・内容要約を明記 |
| Reqord運用ルール: Issue化はReqord側のみ | 該当なし(Phase時点) | `/speckit-taskstoissues` を使わない |
| Reqord運用ルール: 仕様変更時は実装停止 | 該当なし(Phase時点) | 実装フェーズでの運用ルールとして継続適用。`/speckit.clarify` での言語数の縮小は要件側を先に更新済みで、実装着手前の変更 |

違反なし。Complexity Trackingの記入は不要。

## Project Structure

### Documentation (this feature)

```text
specs/011-sidepanel-i18n/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output（Settings への language 追加、辞書の形）
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── i18n/                      # 新規
│   ├── index.js                # t(key, params) / setLanguage / getLanguage / applyStaticTranslations
│   ├── ja.js                   # 日本語辞書
│   └── en.js                   # 英語辞書
├── sidepanel/
│   ├── sidepanel.html          # data-i18n-* 属性を付与
│   ├── sidepanel.js            # 動的生成部分で t() を使用。その他メニューに言語セクション追加。
│   │                           # 言語切替時に applyStaticTranslations + 各再描画関数を呼ぶ。
│   │                           # 項目登録フォームの検証エラーをフィールド別に翻訳
│   ├── sidepanel.css           # 変更なし（見込み。文字幅差でレイアウトが崩れる場合のみ調整）
│   ├── groupPanel.js           # 動的生成部分で t() を使用。refresh 相当の再描画を言語切替から呼べる形にする
│   ├── dragReorder.js          # 変更なし
│   ├── listReorder.js          # 変更なし
│   ├── focusTrap.js            # 変更なし
│   ├── tabOverflow.js          # 変更なし
│   ├── itemFilter.js           # 変更なし
│   └── maskDisplay.js          # 変更なし
└── storage/
    └── settingsRepository.js   # language の取得・保存を追加（setTheme と対になる形）

tests/
└── unit/
    └── i18n.test.js            # 新規: 辞書のキー網羅性、t() の展開・欠落時の挙動

README.md                      # 変更: 多言語対応の記述を追記
```

**Structure Decision**: 既存の「UI層(`sidepanel/`)／データ層(`storage/`)」構成に `src/i18n/` を
第3の薄い層として追加する。翻訳辞書と `t()` はDOMにも `chrome` APIにも依存しない純関数群であり、
既存の `storage/tabOrder.js` や `sidepanel/listReorder.js` と同じ「ロジックをUIから切り離して
テスト可能にする」方針を踏襲する。

## Constitution Check（Phase 1設計後の再評価）

`research.md` / `data-model.md` / `contracts/` / `quickstart.md` 生成後も違反なし。storage層への
変更は既存の `settingsRepository.js` への1関数追加に限られ、technical.yaml の既定decision
（Vanilla JS、ノービルド、Repositoryパターン、vitest + chrome API mock）と整合している。
国際化ライブラリを追加せず辞書オブジェクト+関数のみで実装するため、ノービルド方針を崩さない。

新規ディレクトリ `src/i18n/` の追加は、辞書のキー網羅性という機械的に検証すべき制約
（片方の言語にだけキーが存在する、といった漏れ）を自動テストで担保するための分離であり、
既存の複雑性の枠内に収まる。Complexity Tracking の記入は不要。

## Complexity Tracking

*Constitution Checkに違反なし。本セクションの記入は不要。*
