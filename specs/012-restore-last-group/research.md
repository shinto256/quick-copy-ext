# Research: グループ選択状態の復元

Technical Context に `NEEDS CLARIFICATION` は残っていない（`/speckit.clarify` で未分類タブの扱いを
解消済み）。以下は設計判断の記録。

## Decision 1: 選択状態の保存先

- **Decision**: 新規storage keyを設けず、既存 `settingsRepository.js`（`chrome.storage.local` の
  `settings` キー）に `selectedGroupId` フィールドを追加する
- **Rationale**: `selectedGroupId` は `maskEnabled` / `theme` / `language` と同じ「単一値のUI設定」で
  あり、既存の `get()` / `setXxx()` パターンにそのまま従える。Repositoryパターンの原則
  （storageアクセスの局所化）にも合致し、影響範囲が最小になる
- **Alternatives considered**:
  - 専用の新規storage key（例: `lastSelectedGroup`）と専用Repository関数を新設する案 →
    settingsと役割が重複し、ファイル・関数が1つ増えるだけで得られる利点がない。却下

## Decision 2: 未分類タブの扱い

- **Decision**: `selectedGroupId` は通常のグループIDに加えて `UNASSIGNED_TAB_ID`
  （`itemFilter.js` からのセンチネル値）も許容する
- **Rationale**: clarifyでの決定（未分類タブも選択記憶・復元の対象に含める）に基づく。既存実装でも
  未分類は `tabOrder` 上の1タブとして扱われており、一貫性がある
- **Alternatives considered**: 未分類選択時は保存しない案 → clarifyで不採用と決定済み

## Decision 3: フォールバック判定のタイミング

- **Decision**: `sidepanel.js` の `init()` 内で、`GroupRepository.listTabOrder()` が返す配列に
  `selectedGroupId` が含まれるかを都度チェックし、含まれれば採用、含まれなければ `tabOrder[0]` を採用する
- **Rationale**: `listTabOrder()` は既に「実在するグループとの正規化」を行っており
  （`006-group-navigation` で導入済み）、削除されたグループIDは配列に含まれない。この既存の正規化を
  再利用することで、削除検知のための追加ロジックが不要になる
- **Alternatives considered**: `GroupRepository.list()` で個別に存在確認する案 → `tabOrder` の正規化
  ロジックと二重管理になり、未分類タブの存在確認が別途必要になるため却下

## Decision 4: 保存タイミング

- **Decision**: `selectTab(groupId)` 関数内で選択状態変更と同時に `SettingsRepository` へ書き込む
- **Rationale**: FR-001（選択するたびに記憶する）を満たす最小の変更点。既存の `selectTab` は
  タブクリック・キーボード操作など全ての選択経路が通る唯一の関数であるため、ここ1箇所への追記で
  全経路を網羅できる
- **Alternatives considered**: `beforeunload` 等のタイミングでまとめて保存する案 → サイドパネルが
  閉じられずバックグラウンド化するケースを含め、確実に発火するイベントが存在しないため却下
