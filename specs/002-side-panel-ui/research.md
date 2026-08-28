# Phase 0 Research: サイドパネルUI刷新

## 1. 常駐パネルの実現手段

**Decision**: `chrome.sidePanel` API（Manifest V3、Chrome 114+相当）を採用する。
`manifest.json` に `"side_panel": { "default_path": "src/sidepanel/sidepanel.html" }` と
`"permissions": ["storage", "sidePanel"]` を追加し、`action` からは `default_popup` を削除する。
アクションアイコンのクリックでパネルを開くため、`background` service worker を新設し、
拡張機能インストール時（`chrome.runtime.onInstalled`）に
`chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` を呼び出す。

**Rationale**: `default_path` を設定するだけではアイコンクリック時に自動でパネルが開かない
（Chrome公式仕様）。`setPanelBehavior` の呼び出しが必要で、これは軽量なservice worker 1つで
完結し、既存の「storage層はUI層から一方向にのみ依存」というtechnical.yaml方針にも抵触しない
（backgroundはUIロジック・storageアクセスを持たない）。

**Alternatives considered**:
- 独自オーバーレイ（content scriptでページ内にiframe常駐）: 対象ページのCSPやレイアウトに
  干渉するリスクが高く、Manifest V3標準APIで実現可能な要件に対して過剰な複雑さとなるため却下。
- `default_popup` を残したままウィンドウサイズを固定: ポップアップは他タブ操作で自動的に閉じる
  Chromeの標準挙動があり、「常駐」というUser Story 1のAcceptance Scenario（他タブ操作中も
  閉じない）を満たせないため却下。

## 2. UI層統合（popup + options → 単一sidepanel）

**Decision**: `src/sidepanel/` に単一ページを新設し、既存 `src/popup/` の一覧・コピー・マスク
切替・グループ絞り込みロジックと、`src/options/` の項目登録編集・グループ管理ロジックを統合する。
`src/popup/` `src/options/` はtasks.mdで撤去対象とする。

**Rationale**: FR-011（別画面導線の廃止）を満たすには、登録・編集・グループ管理のUIを一覧と
同じドキュメント内に持つ必要がある。既存の関数群（`populateGroupFilter`, `filterItems`,
`renderItemList`, `renderGroupList` 等）はDOM操作込みで再利用しづらいため、新規ページ側で
書き直しつつ、絞り込みロジックのみ純粋関数として切り出す（下記3参照）。ビジネスロジック
（バリデーション・永続化）はstorage層に閉じているため変更不要。

**Alternatives considered**:
- `options.html` をモーダルとして`iframe`埋め込み: 別ドキュメントのライフサイクル管理が複雑化し、
  画面遷移0回というSC-003/SC-004の検証もしづらくなるため却下。単一ページ内のDOM表示切替
  （モーダル/インライン展開）で十分に要件を満たせる。

## 3. タブ絞り込み＋検索のロジック分離

**Decision**: `src/sidepanel/itemFilter.js` に、DOM非依存の純粋関数
`filterItemsByTabAndSearch(items, selectedGroupId, searchTerm)` を実装する。
グループ判定は既存 `groupId` フィールド（`null` = 未分類）をそのまま利用し、検索は
`item.name` に対する部分一致（大文字小文字を区別しない）とする。

**Rationale**: 既存 `maskDisplay.js` と同様、DOM非依存の純粋関数として切り出すことで
vitestによるユニットテストが容易になる（001の既存パターンを踏襲）。タブ切替時に検索語を
リセットする仕様（Clarifications参照）は、呼び出し側（`sidepanel.js`）の状態管理で対応し、
`itemFilter.js` 自体は現在のタブID・検索語を受け取って結果を返すだけの無状態関数とする。

**Alternatives considered**: 検索を`itemRepository`側（storage層）に持たせる案は、
「storage層は永続化・バリデーションに責務を限定する」という001の設計方針（Repositoryパターン）
と衝突するため却下し、UI層のみに閉じたロジックとした。

## 4. 既存データ・設定の互換性

**Decision**: `chrome.storage.local` のキー（`items` / `groups` / `settings`）・スキーマは
一切変更しない。UI形態変更に伴うデータマイグレーションは不要（spec.md Assumptions参照）。

**Rationale**: storage層の関数シグネチャ・データ構造を変更すると001のcontracts/
（item-repository.md 等）を破壊し、既存テスト（`itemRepository.test.js` 等）にも影響するため、
本specのスコープ外とする。
