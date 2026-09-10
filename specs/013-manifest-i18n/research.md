# Research: 拡張機能名・説明の多言語対応

**Feature**: 013-manifest-i18n | **Date**: 2026-09-10

spec の Assumptions と Edge Cases が前提としているプラットフォーム挙動を、公式ドキュメントで確認した。
確認に用いた出典は次の3点。

- [Internationalization（i18n API リファレンス）](https://developer.chrome.com/docs/extensions/reference/api/i18n)
- [default_locale（manifest リファレンス）](https://developer.chrome.com/docs/extensions/reference/manifest/default-locale)
- [Localize your extension（実装ガイド）](https://developer.chrome.com/docs/extensions/develop/ui/i18n)

## 確認した事実

| 事実 | 内容 | 仕様上の関連 |
| --- | --- | --- |
| 必須の組み合わせ | 多言語化には `_locales` ディレクトリと manifest の `default_locale` の両方が必要。片方だけでは成立しない | FR-006（警告・エラーなしの読み込み） |
| メッセージの置き場所 | `_locales/<localeCode>/messages.json`。利用者に見える文字列をここに定義する | FR-001〜FR-003 |
| manifest からの参照 | manifest のフィールドに `__MSG_<messagename>__` を書くと、解決されたメッセージに置き換わる | FR-001〜FR-003 |
| 解決の順序 | 利用者の優先ロケール → 地域を除いた言語 → `default_locale` の順に探索する | Edge Case（`en-GB` の解決）、FR-003 |
| 地域変種の包含 | `en` は `en_GB` や `en_US` といった変種を包含する | Edge Case（地域付きコード） |
| 疎な翻訳の許容 | `default_locale` の `messages.json` が全キーの値を持っていれば、他ロケールの翻訳が疎でも拡張機能は動作する | Edge Case（対訳の欠け） |
| 未対応ロケールの扱い | Chrome がサポートしないロケールコードは無視される | Decision 2 |

### spec の Edge Case 記述の精緻化

spec の Edge Case では「対訳の一部が欠けているとき、拡張機能の名称が解決できずに読み込みが失敗する
可能性がある」と記述したが、正確な失敗条件は **`default_locale` の `messages.json` にキーが欠けている場合**
である。`default_locale` 以外のロケールでキーが欠けていても、`default_locale` へフォールバックするため
失敗しない。

本実装では日本語・英語の双方に全キーを揃えるため、この条件は余裕を持って満たされる。spec の記述は
より厳しい側の運用ルール（すべての言語で対訳を揃える）として維持し、実装上の必須条件は本ファイルで
明示するに留める。

## Decision 1: `_locales` を manifest メタデータ専用に使い、`chrome.i18n` への全面移行は行わない

- **Decision**: `_locales` と `default_locale` を導入するが、用途は manifest の `name` と `description` に
  限定する。サイドパネル内の表示文字列は既存の `src/i18n/`（`ja.js` / `en.js` / `index.js`）が
  引き続き担う。
- **Rationale**: `chrome.i18n.getMessage()` が返す言語は利用者の優先ロケールと `default_locale` から
  決まり、拡張機能の実行中に切り替えられない。一方 req-000015 は「利用者がサイドパネルのメニューで
  言語を選び、再読み込みなしで即座に反映される」ことを要件としている。`chrome.i18n` へ移行すると
  この要件を満たせなくなる。言語の決定方法が異なる2つの関心事であり、別系統として併存させるのが
  正しい分離になる。
- **Alternatives considered**:
  - **`src/i18n/` を `chrome.i18n` へ全面移行する案** — i18n実装が1系統に統一され見通しは良くなるが、
    上記のとおり req-000015 の実装済み要件を壊すため却下。
  - **`_locales` を導入せず manifest を英語のみにする案** — 日本語利用者の体験が劣化する。
    SC-002（日本語環境の表示が変わらない）に反するため却下。

## Decision 2: ロケールディレクトリは `ja` と `en` の2つとし、地域付きコードは作らない

- **Decision**: `_locales/ja/messages.json` と `_locales/en/messages.json` の2ファイルのみを作る。
  `ja_JP` や `en_US` のような地域付きディレクトリは作らない。
- **Rationale**: 解決の順序が「優先ロケール → 地域を除いた言語 → `default_locale`」であり、`en` は
  `en_GB`/`en_US` を包含する。地域付きディレクトリを作らなくても、英語圏のすべての地域変種が `en` で
  解決される。ディレクトリを増やすと対訳を揃える対象が増え、`default_locale` の完全性を保つ手間だけが
  増える。
- **Alternatives considered**:
  - **`en_US` と `en_GB` を個別に用意する案** — 説明文に地域差がないため意味がない。YAGNI により却下。

## Decision 3: `default_locale` は `ja` とする

- **Decision**: manifest の `default_locale` に `ja` を指定する。
- **Rationale**: FR-003 と SC-003 が「日本語・英語以外の表示言語では日本語で表示される」ことを
  要求している。サイドパネル内の表示言語の既定が日本語（`settingsRepository.js` の
  `DEFAULT_SETTINGS.language = "ja"`）であることとも揃う。
- **Alternatives considered**:
  - **`en` を既定にする案** — 未対応言語環境で英語に落ちる。国際的な公開では妥当な選択だが、
    FR-003 に反するため却下。変更が必要になった場合は要件の変更として扱う。

## Decision 4: メッセージキーは `extName` と `extDescription` にする

- **Decision**: `_locales/*/messages.json` に定義するキーを `extName`（拡張機能の名称）と
  `extDescription`（説明）の2つとし、manifest では `__MSG_extName__` / `__MSG_extDescription__` として
  参照する。
- **Rationale**: 用途が manifest メタデータに限定されるため、キー数は最小の2つで足りる。名称に
  `ext` の接頭辞を付けることで、将来 `src/i18n/` 側のキーと混同されるのを防ぐ。
- **Alternatives considered**:
  - **`appName` / `appDescription`** — 本プロジェクトは拡張機能であり「app」は実体と合わないため却下。
  - **`name` / `description`** — manifest のフィールド名と同一で、参照側の `__MSG_name__` が
    フィールド名なのかキー名なのか読み取りにくいため却下。

## Decision 5: manifest と messages.json の整合を自動テストで検証する

- **Decision**: vitest に、`manifest.json` と `_locales/*/messages.json` を読んで整合を検証する
  ユニットテストを追加する。検証内容は次の4点。
  1. `default_locale` に指定されたロケールのディレクトリと `messages.json` が存在する
  2. manifest 内のすべての `__MSG_*__` 参照に対応するキーが、すべてのロケールの `messages.json` に存在する
  3. すべてのロケールの `messages.json` のキー集合が一致する
  4. すべてのロケールの `extDescription` が132文字以内である
- **Rationale**: 読み込み失敗の直接原因（`default_locale` のキー欠け、参照とキーの不一致）と
  FR-009 の長さ上限を、ブラウザを起動せずに検出できる。ここを外すと拡張機能自体が読み込めず、
  ストア審査で確実に差し戻される。spec の Assumptions では「ブラウザの表示言語に依存する表示の
  自動テストは追加しない」としているが、本テストはデータファイルの整合性検証であり表示言語に
  依存しないため、この前提と矛盾しない。
- **Alternatives considered**:
  - **手動検証のみに委ねる案** — 検証項目が機械的に確認できるものばかりで、回帰の見逃しリスクを
    負う理由がないため却下。
  - **ブラウザ表示言語を切り替える自動テストを組む案** — 拡張機能の読み込みを伴う E2E 基盤が
    現状存在せず、本要件の規模に対して過剰。表示の確認は `quickstart.md` の手動検証に委ねる。

## 権限とレビューへの影響

`chrome.i18n` の利用に manifest の権限追加は不要であり、`_locales` の導入によって要求する権限は
増えない。現状の `permissions` は `storage` と `sidePanel` のみで、`host_permissions` は存在しない。
この状態は本要件の実装後も変わらないため、ストア審査での権限に関する追加説明は発生しない。
