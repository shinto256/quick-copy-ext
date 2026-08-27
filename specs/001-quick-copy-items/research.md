# Research: クイックコピー登録・管理機能

**Phase 0 出力**。Technical Contextに `NEEDS CLARIFICATION` は残っていない
（技術選定はReqordの技術ヒアリング・トレードオフ検討で事前に確定済み。以下は各決定の記録）。

## 1. データアクセス層の実装方式

- **Decision**: Repositoryパターンで実装する（`ItemRepository` / `GroupRepository` /
  `SettingsRepository`）
- **Rationale**: `chrome.storage.local` の読み書きをstorageモジュールに集約し、グループ機能
  （spec-000004）追加時など将来の変更影響範囲を局所化するため
- **Alternatives considered**: popup/optionsから `chrome.storage.local` を直接呼び出す方式。
  実装コストは最小だが、項目数・機能増加時にコード重複が増えるため不採用

## 2. ビルド・パッケージング方式

- **Decision**: ビルドツールを導入せず、素のJS/HTML/CSSのままzip化してストア申請する
- **Rationale**: ポップアップ・設定画面のみの小規模拡張であり、Vanilla JS採用の既定方針と一致
  し初期セットアップコストを避けられるため
- **Alternatives considered**: esbuild等の軽量ビルド導入。モジュール分割やminify、将来のTS
  移行に有利だが、現時点のスコープでは過剰と判断し不採用

## 3. テスト戦略

- **Decision**: vitest + `chrome.storage.local` / `navigator.clipboard` のmockによるユニット
  テストを導入する
- **Rationale**: 各要件の成功基準（SC-001〜SC-010）が境界値・上限件数など数値化されており、
  自動テストで再現性を担保できるため
- **Alternatives considered**: 手動テストのみ。導入コストはゼロだが回帰検知が人力に依存する
  ため不採用

## 4. クリップボードコピーの実装

- **Decision**: `navigator.clipboard.writeText()` のみを使用する
- **Rationale**: 対応ブラウザをChrome/Edge最新版に限定しており、Clipboard APIで十分カバー
  できるため
- **Alternatives considered**: `document.execCommand('copy')` によるフォールバック併用。
  古い環境向けの保険だが、対象ブラウザ範囲では不要と判断し不採用

## 5. データ永続化キー設計

- **Decision**: `chrome.storage.local` に3キー（`items` / `groups` / `settings`）で保持する
- **Rationale**: エンティティ単位（登録項目・グループ・表示設定）でキーを分離することで、
  Repositoryごとの責務が明確になり、読み書きの競合範囲も最小化できるため
- **Alternatives considered**: 単一キー（例: `state`）にまとめて保持する方式。読み書きの
  トランザクション性はやや単純化されるが、Repository分割の意図（決定1）と整合しないため不採用

## 6. 値（コピー対象文字列）の複数行対応

- **Decision**: 値は改行を含む複数行テキストを許容する（`/speckit-clarify` セッションで確定）
- **Rationale**: 住所など複数行の定型文を想定した機能要求のため
- **Alternatives considered**: 1行のみ許容。入力UIは単純化できるが、想定ユースケース（複数行
  住所）を満たせないため不採用
