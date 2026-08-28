# Contract: settingsRepository 追加関数・スキーマ変更

対象: `src/storage/settingsRepository.js`（既存の`get`/`setMaskEnabled`は変更しない）

## スキーマ変更

`DEFAULT_SETTINGS`に`theme: "auto"`を追加する:

```js
const DEFAULT_SETTINGS = { maskEnabled: true, theme: "auto" };
```

既存ユーザーの保存済み`settings`（`theme`未設定）に対して`get()`を呼んだ場合、`theme`は
`"auto"`として扱われること（`{ ...DEFAULT_SETTINGS, ...stored }`のマージパターンで実現）。

## setTheme(theme)

```text
setTheme(theme: "auto" | "light" | "dark"): Promise<void>
```

### 振る舞い

既存`setMaskEnabled`と同じパターン: 現在の設定を取得し、`theme`のみ更新して永続化する。

### エラー

| ケース | 対応 |
|--------|------|
| `"auto" \| "light" \| "dark"` 以外の値が渡された場合 | `ValidationError("theme", ...)`を投げる |

### テスト観点

- `setTheme("dark")`後、`get()`が`{ theme: "dark" }`を含むことを検証する。
- 未設定(初回起動)の`get()`が`theme: "auto"`を返すことを検証する。
- 不正な値(`"blue"`等)を渡すと`ValidationError`が投げられ、`theme`が変更されないことを検証する。
