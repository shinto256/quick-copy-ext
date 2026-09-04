# Phase 1: Data Model — サイドパネルの多言語対応

**Feature**: `011-sidepanel-i18n` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

`chrome.storage.local` に保存するデータのうち、本機能で追加・変更されるものを定義する。

## 変更サマリ

| キー | 変更 |
|------|------|
| `settings` | `language` 属性を追加（`"ja"` \| `"en"`、既定 `"ja"`） |

新規ストレージキーは追加しない。既存のスキーマ変更なしで読める
（`get()` が `{ ...DEFAULT_SETTINGS, ...stored }` を返す既存の仕組みにより、
`language` を含まない旧データにも既定値が補われる）。

---

## エンティティ: Settings（既存・属性追加）

**ストレージキー**: `settings`

**型**: `{ maskEnabled: boolean, theme: "auto" | "light" | "dark", language: "ja" | "en" }`

### 追加する属性

| 属性 | 型 | 既定値 | 検証 |
|------|-----|--------|------|
| `language` | `"ja"` \| `"en"` | `"ja"` | `create` 系はないため常に `setLanguage()` 経由。無効な値は `ValidationError` |

### 異常値の扱い

保存されている値が `"ja"` / `"en"` のいずれでもない場合（本feature導入前のデータ、または
ストレージの手動編集による破損）、`get()` は `"ja"` を返す（spec FR-007、Edge Cases）。

---

## エンティティ: 翻訳辞書（新規・永続化しない）

`src/i18n/ja.js` / `src/i18n/en.js` が持つ、キーと文言（または文言を組み立てる関数）の対応。
`chrome.storage.local` には保存しない。コードに埋め込まれた静的なデータであり、実行時に
変化しない。

**型**:

```text
type Dictionary = Record<string, string | ((params: Record<string, unknown>) => string)>
```

### 制約

- `ja.js` と `en.js` は**同じキー集合**を持つ（[contracts/i18n-contract.md](./contracts/i18n-contract.md) 参照）。
- キーはドット区切りの1階層で、画面の領域を表すプレフィックスを持つ
  （`header.*` / `moreMenu.*` / `tabs.*` / `selection.*` / `itemList.*` / `itemCard.*` /
  `itemForm.*` / `groupPanel.*` / `copyStatus.*`）。

---

## UI上の一時状態（永続化しない）

`sidepanel.js` が保持する状態。

| 状態 | 内容 |
|------|------|
| `currentLanguage` | 現在の表示言語。`init()` で `SettingsRepository.get()` から復元し、`selectLanguage()` で更新する。既存の `currentTheme` と同じ扱い |

`src/i18n/index.js` 内部の「現在の言語」は `currentLanguage` と同じ値を持つが、`t()` から
参照するために `setLanguage()` / `getLanguage()` として `i18n` モジュール側にも保持する
（`sidepanel.js` の `currentLanguage` は表示用途、`i18n` モジュール内部の値は `t()` の参照用途で
役割が異なるため、二重管理ではなく責務の分離）。
