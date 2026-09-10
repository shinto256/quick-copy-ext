# Contract: ロケールメッセージと manifest 参照

**Feature**: 013-manifest-i18n | **Date**: 2026-09-10

拡張機能がブラウザおよび Chrome Web Store に対して公開するメタデータの契約を定義する。
この契約の相手はブラウザ（manifest の `__MSG_*__` を解決する主体）であり、実装側が守るべき形を示す。

## 契約1: メッセージキーの集合

`_locales/<localeCode>/messages.json` が定義するキーは次の2つに限る。増やす場合は本契約と
`data-model.md` を先に更新する。

| キー | 用途 | manifest 側の参照 |
| --- | --- | --- |
| `extName` | 拡張機能の名称 | `manifest.json` の `name` |
| `extDescription` | 拡張機能の説明 | `manifest.json` の `description` |

## 契約2: ファイル形式

```json
{
  "extName": {
    "message": "<表示される名称>",
    "description": "<訳者向けの補足。省略可>"
  },
  "extDescription": {
    "message": "<表示される説明>",
    "description": "<訳者向けの補足。省略可>"
  }
}
```

- `message` は必須で、空文字列を許さない。
- `description` は訳者向けの補足であり、ブラウザには表示されない。省略してよい。
- `placeholders` は本要件では使わない（置換対象の動的な値が存在しないため）。

## 契約3: ロケールディレクトリ

| ロケールコード | ディレクトリ | 役割 |
| --- | --- | --- |
| `ja` | `_locales/ja/` | 既定のロケール。全キーの値を必ず持つ |
| `en` | `_locales/en/` | 英語。`en_US` / `en_GB` などの地域変種もここで解決される |

地域付きのディレクトリ（`ja_JP` / `en_US` など）は作らない。

## 契約4: manifest 側の宣言

```json
{
  "name": "__MSG_extName__",
  "description": "__MSG_extDescription__",
  "default_locale": "ja"
}
```

- `default_locale` は `_locales` の存在と対で必須。片方だけの状態を作ってはならない。
- `default_locale` の値は `_locales` 配下に実在するディレクトリ名と一致しなければならない。

## 契約5: ブラウザ側の解決の順序（前提として依存する挙動）

ブラウザは次の順序でメッセージを探索する。実装はこの順序に依存する。

1. 利用者の優先ロケール（例: `en_GB`）
2. 地域を除いた言語（例: `en`）
3. `default_locale`（本要件では `ja`）

この結果として次が保証される。

- `en-US` / `en-GB` 環境 → `_locales/en/` が使われる（契約3の地域変種の扱い）
- `de` / `fr` / `zh` 環境 → `_locales/ja/` が使われる（FR-003）

出典: [Internationalization（i18n API リファレンス）](https://developer.chrome.com/docs/extensions/reference/api/i18n)

## 契約6: 既存の `src/i18n/` との非干渉

- `_locales` のメッセージは、`src/i18n/` のいかなるキーからも参照されない。
- `src/i18n/` の文字列は、manifest からも `_locales` からも参照されない。
- 利用者がサイドパネルで選択した言語（`settings.language`）は、拡張機能の名称・説明の表示言語に
  影響を与えない（FR-004）。
- 本要件の実装によって `src/i18n/` の公開関数のシグネチャ・挙動は変更されない（FR-005）。

## 破壊的変更となる操作

以下は本契約に違反し、拡張機能の読み込み失敗またはストア審査での差し戻しを招く。

- `default_locale` を指定したまま対応する `_locales/<locale>/messages.json` を削除する
- `manifest.json` に `__MSG_*__` 参照を追加したまま、対応するキーを `messages.json` に定義しない
- `default_locale` のロケールで一部のキーの値を空にする
- `extDescription.message` を132文字より長くする
