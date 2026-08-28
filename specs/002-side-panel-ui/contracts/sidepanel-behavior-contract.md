# Contract: サイドパネル表示・操作契約

対象: `manifest.json`（`side_panel` / `action` / `background` / `permissions`）、
`src/background/background.js`、`src/sidepanel/sidepanel.html` / `sidepanel.js`

## manifest.json契約

- `permissions` に `storage` と `sidePanel` を含む。
- `action` に `default_popup` を持たない（サイドパネルへ一本化するため）。
- `side_panel.default_path` は `src/sidepanel/sidepanel.html` を指す。
- `background.service_worker` は `src/background/background.js` を指す（type: module 不要、
  Chrome Extension APIのみ使用のためVanilla JSで完結）。

## background.js契約

- `chrome.runtime.onInstalled` リスナー内で
  `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` を1回呼び出す。
- それ以外の業務ロジック（storageアクセス、バリデーション等）は一切持たない
  （technical.yaml「storage層はUI層から一方向にのみ依存」を維持するため、backgroundは
  UI層にもstorage層にも該当しない薄い設定コードに限定する）。

## sidepanel.html / sidepanel.js 契約（DOM構造の最小要件）

- ヘッダー領域に以下を含む：
  - 検索入力欄（`id="search-input"` 等、名前検索用）
  - マスク表示切替トグル（常時表示、1操作で切替完了。FR-012）
  - 項目追加を開始する操作要素（鉛筆アイコン等）
- タブ領域：
  - グループ数 + 1（未分類）個のタブ要素を表示
  - 末尾に新規グループ作成を開始する操作要素（「+」）
  - 「未分類」を除く各グループタブに、名称編集・削除を起動する操作要素（ケバブ/長押し等の
    タブ個別メニュー）を設ける。選択操作で「名称編集」「削除」の2択を提示し、名称編集は
    タブ内インライン入力（またはパネル内フォーム）で完結させ、削除は確認の上で実行する
    （FR-008準拠。「未分類」タブは固定タブのため編集・削除の対象外）
- 一覧領域：
  - 選択中タブの項目をカード単位で表示（名前・マスク対応値・コピー操作・編集/削除メニュー）
  - 0件時は空状態メッセージを表示
- 入力用UI（登録・編集共通）：
  - 名前・値・所属グループ入力欄、保存・キャンセル操作
  - 表示中は一覧領域を置き換えるか重ねて表示し、別ドキュメントへの遷移（`window.location`
    変更や新規タブ・ウィンドウのオープン）を発生させないこと

## 契約検証方法

- 手動検証: `quickstart.md` の手順に従い、拡張機能を読み込みサイドパネルの開閉・タブ切替・
  項目追加/編集/削除・グループ追加/編集/削除が画面遷移なしに行えることを確認する。
- 自動検証: `itemFilter.js` はユニットテスト対象（`item-filter-contract.md`）。
  DOM組み立て自体（`sidepanel.js`）はvitestの対象外とし、手動検証で担保する
  （001でも `popup.js` / `options.js` はDOM結合部分のユニットテスト対象外としており、
  同方針を踏襲）。
