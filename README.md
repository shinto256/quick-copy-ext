# quick-copy-ext

フォーム入力で繰り返し使う定型文字列（例: 英語住所）を名前付きで登録し、一覧からワンクリックでコピーできるChrome/Edge拡張機能。値はデフォルトでマスク表示され、表示/非表示の切替やグループでの整理ができる。UIはブラウザに常駐するサイドパネルとして提供され、項目登録・グループ管理も含めてすべてパネル内で完結する。

## 機能

- 項目（名前＋値）の登録・編集・削除（サイドパネル内のインラインUIで完結、画面遷移なし）
- タブ（グループ）+カード形式の一覧表示とワンクリックコピー（値はデフォルトでマスク表示）
- マスク表示のON/OFF切替（ヘッダーに常時表示、状態は保持）
- 全グループパネル：タブバー末尾の「▾」から未分類を含む全タブを縦リストで一覧し、グループ名で絞り込んで切り替え（キーボードのみでも操作可能。行にフォーカスして `Enter` / `Space` で切替、`Alt` + `↑` / `↓` で並び替え）
- グループの作成・名称編集・削除（全グループパネル内で完結。グループを削除すると所属する項目も削除される）
- グループのドラッグ&ドロップによる並び替え（未分類も対象。並び順がタブ順と起動時に開くタブになる）
- 項目名での検索絞り込み
- 項目の並び替え：カード左端の掴み手（`⠿`）からのドラッグ、またはカードにフォーカスして `Alt` + `↑` / `↓`（グループ内、検索中と選択モード中は無効）
- テーマの自動追従（OS設定）に加え、ライト/ダークの手動固定
- 選択モードによる複数項目の一括削除・グループ一括変更（選択中は各カードのコピー・個別メニュー操作を無効化）

グループ名の上限は20文字（全グループパネルの縦リスト1行に収まる文字数）。
起動時に開くタブは並び順の先頭のタブで、既定では「未分類」。よく使うグループを
並び順の先頭へドラッグしておくと、そのグループが開いた状態で始まる。

オーバーレイ（全グループパネル・項目登録フォーム）の表示中はフォーカスがその中を循環し、
`Escape` で閉じると開く前の位置にフォーカスが戻る。

並び替えの操作は項目カードとグループの縦リストで統一されている。どちらもドラッグと
`Alt` + `↑` / `↓` の2手段で、カードは `Enter` / `Space` でコピー、グループの行は同じキーで切替。

ドラッグの起点だけは異なる。項目カードは**左端の掴み手からのみ**ドラッグを開始する（カード本体を
押す操作はコピーに割り当てられているため、誤って並び替わるのを防ぐ）。グループの縦リストは
行のどこからでもドラッグできる（行を押す操作は切替で、誤操作の代償が小さい）。

詳細な仕様は [specs/001-quick-copy-items/spec.md](specs/001-quick-copy-items/spec.md)（登録・一覧・マスク・グループの各機能要件）、
[specs/002-side-panel-ui/spec.md](specs/002-side-panel-ui/spec.md)（サイドパネルUI刷新）、
[specs/003-sidepanel-list-enhancements/spec.md](specs/003-sidepanel-list-enhancements/spec.md)（並び替え・テーマ手動切替・一括削除）、
[specs/005-bulk-group-change/spec.md](specs/005-bulk-group-change/spec.md)（選択項目グループ一括変更・選択モード中の個別操作制限）、
[specs/006-group-navigation/spec.md](specs/006-group-navigation/spec.md)（全グループパネル・グループ並び替え・グループ名の長さ制御）、
[specs/007-sidepanel-keyboard/spec.md](specs/007-sidepanel-keyboard/spec.md)（キーボード操作・フォーカス管理）、
[specs/008-item-reorder-unification/spec.md](specs/008-item-reorder-unification/spec.md)（項目並び替え操作の統一）、
[specs/009-item-reorder-handle/spec.md](specs/009-item-reorder-handle/spec.md)（項目カードの並び替えハンドル）を参照。

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

動作確認の手順は [specs/001-quick-copy-items/quickstart.md](specs/001-quick-copy-items/quickstart.md)、
[specs/002-side-panel-ui/quickstart.md](specs/002-side-panel-ui/quickstart.md)、
[specs/003-sidepanel-list-enhancements/quickstart.md](specs/003-sidepanel-list-enhancements/quickstart.md)、
[specs/005-bulk-group-change/quickstart.md](specs/005-bulk-group-change/quickstart.md)、
[specs/006-group-navigation/quickstart.md](specs/006-group-navigation/quickstart.md)、
[specs/007-sidepanel-keyboard/quickstart.md](specs/007-sidepanel-keyboard/quickstart.md)、
[specs/008-item-reorder-unification/quickstart.md](specs/008-item-reorder-unification/quickstart.md)、
[specs/009-item-reorder-handle/quickstart.md](specs/009-item-reorder-handle/quickstart.md) を参照。
