# quick-copy-ext

フォーム入力で繰り返し使う定型文字列（例: 英語住所）を名前付きで登録し、一覧からワンクリックでコピーできるChrome/Edge拡張機能。値はデフォルトでマスク表示され、表示/非表示の切替やグループでの整理ができる。UIはブラウザに常駐するサイドパネルとして提供され、項目登録・グループ管理も含めてすべてパネル内で完結する。

## 機能

- 項目（名前＋値）の登録・編集・削除（サイドパネル内のインラインUIで完結、画面遷移なし）
- タブ（グループ）+カード形式の一覧表示とワンクリックコピー（値はデフォルトでマスク表示）
- マスク表示のON/OFF切替（ヘッダーに常時表示、状態は保持）
- グループの作成・名称編集・削除、タブ切替による絞り込み
- 項目名での検索絞り込み

詳細な仕様は [specs/001-quick-copy-items/spec.md](specs/001-quick-copy-items/spec.md)（登録・一覧・マスク・グループの各機能要件）および
[specs/002-side-panel-ui/spec.md](specs/002-side-panel-ui/spec.md)（サイドパネルUI刷新）を参照。

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
4. 拡張機能アイコンをクリックするとサイドパネルが開く

動作確認の手順は [specs/001-quick-copy-items/quickstart.md](specs/001-quick-copy-items/quickstart.md) および
[specs/002-side-panel-ui/quickstart.md](specs/002-side-panel-ui/quickstart.md) を参照。
