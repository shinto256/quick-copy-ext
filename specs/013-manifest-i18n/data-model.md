# Data Model: 拡張機能名・説明の多言語対応

**Feature**: 013-manifest-i18n | **Date**: 2026-09-10

本要件は永続データ（`chrome.storage.local`）を扱わない。ここで定義するのは、リポジトリ内に静的
ファイルとして存在する設定データの構造である。

## エンティティ

### LocaleMessages（`_locales/<localeCode>/messages.json`）

ロケールごとに1ファイル存在する。ブラウザが拡張機能の読み込み時に読み、manifest の `__MSG_*__`
参照を解決するために使う。

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `extName` | object | 必須 | 拡張機能の名称のメッセージ定義 |
| `extName.message` | string | 必須 | 表示される名称の文字列 |
| `extName.description` | string | 任意 | 訳者向けの補足。ブラウザには表示されない |
| `extDescription` | object | 必須 | 拡張機能の説明のメッセージ定義 |
| `extDescription.message` | string | 必須 | 表示される説明の文字列 |
| `extDescription.description` | string | 任意 | 訳者向けの補足。ブラウザには表示されない |

**インスタンス**

| ロケール | `extName.message` | `extDescription.message` |
| --- | --- | --- |
| `ja` | `Quick Copy` | `登録した定型文字列をワンクリックでコピーできる拡張機能` |
| `en` | `Quick Copy` | `Copy your registered text snippets to the clipboard with a single click.` |

### ExtensionMetadata（`manifest.json` の該当フィールド）

| フィールド | 変更前 | 変更後 |
| --- | --- | --- |
| `name` | `Quick Copy` | `__MSG_extName__` |
| `description` | `登録した定型文字列をワンクリックでコピーできる拡張機能` | `__MSG_extDescription__` |
| `default_locale` | （未設定） | `ja` |

`manifest.json` のその他のフィールド（`manifest_version` / `version` / `permissions` / `action` /
`side_panel` / `background` / `icons`）は変更しない。

## 検証ルール

要件から導かれる制約。`tests/unit/localeMessages.test.js` で機械的に検証する。

| ルール | 内容 | 根拠 |
| --- | --- | --- |
| VR-001 | `default_locale` に指定したロケールの `_locales/<locale>/messages.json` が存在する | FR-006。欠けると拡張機能が読み込めない |
| VR-002 | `manifest.json` に現れるすべての `__MSG_<key>__` の `<key>` が、すべてのロケールの `messages.json` に存在する | FR-006 |
| VR-003 | すべてのロケールの `messages.json` のキー集合が一致する | FR-006、FR-008 |
| VR-004 | すべてのロケールの `extDescription.message` が132文字以内である | FR-009、SC-008 |
| VR-005 | すべてのロケールの `extName.message` が同一の文字列である | FR-007、SC-007 |
| VR-006 | すべてのメッセージ定義が空でない `message` を持つ | FR-006 |
| VR-007 | `en` の `extDescription.message` が spec の Assumptions に定めた文言と完全に一致する | SC-009 |

## 状態遷移

該当なし。静的な設定データであり、実行時に変化しない。

## 言語決定の対応関係

本要件で扱うデータと、既存の `src/i18n/` が扱うデータの境界。

| 観点 | `_locales/`（本要件） | `src/i18n/`（req-000015、変更しない） |
| --- | --- | --- |
| 決定するもの | 拡張機能の名称・説明 | サイドパネル内の表示文字列 |
| 言語の決め方 | ブラウザの表示言語（利用者のOS/ブラウザ設定） | 利用者がサイドパネルのメニューで選択 |
| 保存場所 | リポジトリ内の静的JSON | リポジトリ内の静的JS + 選択値は `settings.language` |
| 実行中の切替 | 不可 | 可能（再読み込み不要） |
| 未対応言語の扱い | `default_locale`（`ja`）へフォールバック | 既定値 `ja` を使用 |

両者は互いに参照せず、影響も与えない（FR-004、FR-005）。
