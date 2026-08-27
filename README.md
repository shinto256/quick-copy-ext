# quick-copy-ext

フォーム入力で繰り返し使う定型文字列（例: 英語住所）を名前付きで登録し、一覧からワンクリックでコピーできるChrome/Edge拡張機能。値はデフォルトでマスク表示され、表示/非表示の切替やグループでの整理ができる。

## 機能

- 項目（名前＋値）の登録・編集・削除
- 一覧表示とワンクリックコピー（値はデフォルトでマスク表示）
- マスク表示のON/OFF切替（状態は保持）
- グループによる項目の整理・絞り込み

詳細な仕様は [specs/001-quick-copy-items/spec.md](specs/001-quick-copy-items/spec.md) を参照。

## 開発

```bash
npm install
npm test
```

## 拡張機能の読み込み方法（パッケージ化されていない拡張機能）

ビルドは不要。

1. Chromeで `chrome://extensions`（Edgeは `edge://extensions`）を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」を選択し、このリポジトリのルート（`manifest.json` のあるディレクトリ）を指定する

動作確認の手順は [specs/001-quick-copy-items/quickstart.md](specs/001-quick-copy-items/quickstart.md) を参照。
