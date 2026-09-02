# Implementation Plan: DADS準拠UIデザイン刷新

**Branch**: `feature/req-000008` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Reqord Requirement**: req-000008 (approved, v1.0)

**Input**: Feature specification from `/specs/004-dads-ui-refresh/spec.md`

## Summary

サイドパネルUIの視覚デザインをデジタル庁デザインシステム(DADS)に準拠させる。既存のDOM構造・イベント処理・保存データは変更せず、`sidepanel.css` のトークン定義とスタイル指定の刷新、書体ファイルの同梱、キーボード操作とスクリーンリーダー向けの属性追加に限定する。

技術的アプローチは4点。第一に、DADS公式トークンリポジトリ(MIT)から色値を転記し、ライト/ダーク両テーマのCSSカスタムプロパティとして定義する。DADSはダークテーマを定義していないため、同じプリミティブスケールから選び直し、コントラスト比で準拠を担保する。第二に、常用漢字までを収録した Noto Sans JP の可変フォントサブセット(640KB)を同梱する。第三に、コントラスト比を検証する vitest テストを追加し、`sidepanel.css` を単一の情報源として読み取って検査する。第四に、既存機能の回帰は手動確認チェックリストで担保する。

## Technical Context

**Language/Version**: JavaScript (ES Modules) / HTML / CSS — トランスパイルなし

**Primary Dependencies**: なし(実行時)。開発時のみ vitest ^4.1.4

**Storage**: `chrome.storage.local` — 本機能では変更なし

**Testing**: vitest (`npm test` → `vitest run`)。既存5ファイルに加え、コントラスト比検査を1ファイル追加

**Target Platform**: Chrome / Edge のサイドパネル (Manifest V3)

**Project Type**: ブラウザ拡張機能 (単一プロジェクト、ノービルド)

**Performance Goals**: 書体読み込みによる初回表示の遅延を体感できない範囲に収める(ローカル読み込み、`font-display: swap`)

**Constraints**:
- ビルドツール・CSSフレームワーク・プリプロセッサを導入しない
- 配布パッケージへの追加は1MB以内 (SC-007)
- 既存のDOM構造・クラス名・イベントハンドリングを変更しない
- 全テキスト14px以上、本文の行間1.5倍以上
- コントラスト比: テキスト4.5:1、非テキスト3:1

**Scale/Scope**: 1画面(サイドパネル)、CSS約500行、影響コンポーネント約20種

## Constitution Check

*GATE: Phase 0 前に通過必須。Phase 1 設計後に再確認。*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. Reqord承認必須 | PASS | req-000008 は approved (v1.0)。PR #35 マージ済み |
| II. 要件のSpec入力への反映 | PASS | spec.md 冒頭に要件IDと要約を記載。`/speckit.specify` 実行時に要件内容を入力として与えた |
| Reqord運用: Issue化はReqord側 | 遵守予定 | `/speckit.taskstoissues` は使用しない。Issue化が必要なら `reqord task create` を用いる |
| Reqord運用: 仕様変更時は即停止 | 遵守予定 | 実装中に仕様からの逸脱が生じた場合は停止し、`feedback` ラベル付きIssueを作成する |

**Phase 1 後の再確認**: PASS(下記「Post-Design Constitution Check」参照)

## Project Structure

### Documentation (this feature)

```text
specs/004-dads-ui-refresh/
├── plan.md              # このファイル
├── research.md          # Phase 0 出力 (R1〜R9)
├── data-model.md        # Phase 1 出力 (デザイントークン定義)
├── quickstart.md        # Phase 1 出力 (検証手順)
├── contracts/
│   └── design-tokens.md # Phase 1 出力 (トークン契約)
├── checklists/
│   ├── requirements.md  # spec品質チェックリスト
│   └── regression.md    # 既存機能の手動確認チェックリスト (FR-026)
└── tasks.md             # Phase 2 出力 (/speckit.tasks が生成)
```

### Source Code (repository root)

```text
src/
├── background/
│   └── background.js          # 変更なし
├── sidepanel/
│   ├── fonts/                 # 新規
│   │   ├── NotoSansJP-subset.woff2   # 新規: 可変サブセット 640KB
│   │   └── OFL.txt                    # 新規: SIL OFL 1.1 全文
│   ├── sidepanel.css          # 全面刷新: トークン定義 + 全コンポーネントのスタイル
│   ├── sidepanel.html         # 最小限の変更: 属性追加のみ
│   ├── sidepanel.js           # 最小限の変更: 動的生成要素への属性付与のみ
│   ├── itemFilter.js          # 変更なし
│   └── maskDisplay.js         # 変更なし
└── storage/                   # 変更なし(全ファイル)

tests/unit/
├── contrastRatio.test.js      # 新規: コントラスト比検査
├── groupRepository.test.js    # 変更なし
├── itemFilter.test.js         # 変更なし
├── itemRepository.test.js     # 変更なし
├── maskDisplay.test.js        # 変更なし
└── settingsRepository.test.js # 変更なし

manifest.json                  # 変更なし (web_accessible_resources / CSP とも不要)
```

**Structure Decision**: 既存の単一プロジェクト構成を維持する。新規ディレクトリは書体を置く `src/sidepanel/fonts/` のみ。CSSの分割(トークンとコンポーネントで別ファイル化)は行わない — `sidepanel.html` からの読み込みが1ファイルで完結している現構成を保ち、`@import` による追加のラウンドトリップを避けるため。

## 実装方針

### 1. トークン定義 (`sidepanel.css` 冒頭)

`:root` にライトテーマの全トークンを定義し、`@media (prefers-color-scheme: dark)` と `:root[data-theme="dark"]` の2ブロックでダーク値を上書きする。既存のテーマ切替機構(`data-theme` 属性)をそのまま利用するため、この3ブロック構成は現行と同じ。

トークンの種別:
- 色: `--color-*` (14種 × 2テーマ)
- 書体: `--font-family-sans`, `--font-size-*`, `--line-height-*`, `--letter-spacing-*`
- 余白: `--space-1` 〜 `--space-6`
- 角丸: `--radius-control`, `--radius-container`, `--radius-full`
- 影: `--elevation-2`, `--elevation-6`

具体値は [research.md](./research.md) R3・R6・R7 と [contracts/design-tokens.md](./contracts/design-tokens.md) を参照。

### 2. フォーカス表示

`:focus-visible` に対しDADS指定の二重構造を適用する。テーマによる色の変更は行わない(research.md R5)。既存CSSにフォーカス指定は一切ないため、全インタラクティブ要素に一括で効く共通指定を1箇所置く。ブラウザ既定の `outline` に依存している現状から、明示的な指定に切り替える。

### 3. 文字サイズの引き上げ

現行で14px未満の13箇所をすべて引き上げる。対象と割り当て後の値は [contracts/design-tokens.md](./contracts/design-tokens.md) のコンポーネント対応表に記載。`body` にはフォントサイズの明示指定がなく既定の16pxに依存しているため、トークンによる明示指定に変更する。

### 4. HTML/JSへの変更(最小限)

- `sidepanel.html`: 変更は生じない見込み。既存の `aria-label` / `role` は適切に付与済み。
- `sidepanel.js`: グループタブの選択状態に `aria-current="true"` を付与する(FR-019)。現状は `.active` クラスによる色と太さのみで、支援技術に選択状態が伝わらない。変更は `createTabButton` 相当の1箇所。

### 5. コントラスト比テスト

`tests/unit/contrastRatio.test.js` を新規作成する。`node:fs` で `sidepanel.css` を読み、`:root` ブロックと `:root[data-theme="dark"]` ブロックから `--color-*` を抽出。テストコード内に定義したペア一覧(21組)に対しWCAG式でコントラスト比を計算し、基準を下回るものがあれば失敗させる。詳細は [contracts/design-tokens.md](./contracts/design-tokens.md)。

### 6. 手動確認チェックリスト

`checklists/regression.md` を作成する。既存8機能(登録/一覧/コピー/マスク切替/グループ管理/並び替え/テーマ切替/一括削除)の操作手順と期待結果、およびキーボード到達性(SC-003)・最小幅表示(SC-006)の確認項目を含む。実装完了後にブラウザで実機確認する。

## Post-Design Constitution Check

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. Reqord承認必須 | PASS | 設計はreq-000008の範囲内。新たな機能追加なし |
| II. 要件のSpec入力への反映 | PASS | plan/research/contracts すべてがspec.mdのFR・SCを参照して構成されている |

設計による憲法違反なし。Complexity Tracking の記入不要。

## リスクと留意点

| 項目 | 内容 | 対応 |
|---|---|---|
| 収録外文字のフォールバック | 項目名・値は利用者入力のため、常用漢字外(人名用漢字・旧字体・絵文字)はシステム書体で表示され字面が混在する | 常用漢字を下限とし、混在時もレイアウトが崩れないことを手動確認で担保(spec エッジケース) |
| 情報密度の低下 | 文字サイズ引き上げにより1画面の表示件数が約10件→8件に減少 | clarifyでユーザー合意済み(spec Assumptions) |
| テストとCSSの乖離 | コントラスト比テストのペア一覧は手書きのため、CSSの実際の使用箇所と乖離しうる | 手動確認チェックリストで補完(research.md R8) |
| ダークテーマの黒outline | ダーク地(#1a1a1a)で黒の外周が判別できない | 内側のYellow-300(12.21:1)が視認を担保。DADS指定のまま変更しない(research.md R5) |

## Phase 出力

- **Phase 0**: [research.md](./research.md) — R1〜R9、NEEDS CLARIFICATION なし
- **Phase 1**: [data-model.md](./data-model.md), [contracts/design-tokens.md](./contracts/design-tokens.md), [quickstart.md](./quickstart.md)
- **Phase 2**: `/speckit.tasks` が `tasks.md` を生成(このコマンドの範囲外)
