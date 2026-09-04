# Contract: SettingsRepository への language 追加

対象: `src/storage/settingsRepository.js`（既存ファイルへの追加）

既存の `get` / `setMaskEnabled` / `setTheme` のシグネチャは変更しない。

## 変更

```text
const VALID_LANGUAGES = ["ja", "en"];
const DEFAULT_SETTINGS = { maskEnabled: true, theme: "auto", language: "ja" };
```

## 追加するエクスポート

```text
setLanguage(language: "ja" | "en"): Promise<void>
```

### 振る舞い

1. `language` が `VALID_LANGUAGES` に含まれない場合、`ValidationError("language", ...)` を投げる。
2. 現在の設定を `get()` で取得し、`language` を上書きして `setItem("settings", ...)` で保存する
   （`setTheme` と同じパターン）。

## `get()` の変更

既存の `get()` は `{ ...DEFAULT_SETTINGS, ...stored }` を返す。これに加えて、
**`stored.language` が `VALID_LANGUAGES` に含まれない場合は `"ja"` に丸める**処理を追加する
（本feature導入前の `settings`、または不正なストレージ編集への防御。spec FR-007、Edge Cases）。

```text
get():
  stored = getItem("settings", DEFAULT_SETTINGS)
  merged = { ...DEFAULT_SETTINGS, ...stored }
  if merged.language not in VALID_LANGUAGES:
    merged.language = "ja"
  return merged
```

## テスト観点

- `setLanguage("en")` の後に `get()` が `language: "en"` を返す。
- `setLanguage("ja")` に戻すと `get()` が `language: "ja"` を返す。
- `setLanguage("zh")` のように無効な値を渡すと `ValidationError` を投げ、保存された値が
  変わらない。
- `language` を含まない `settings`（本feature導入前のデータを模した状態）で `get()` を呼ぶと
  `language: "ja"` が補われる。
- ストレージに直接 `language: "zh"` のような無効な値を書き込んだ状態で `get()` を呼ぶと
  `language: "ja"` に丸められる（保存データ自体は書き換えない。読み出し時にのみ丸める）。
- `setLanguage` を呼んでも `theme` / `maskEnabled` の値が変わらない。
