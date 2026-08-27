<!--
Sync Impact Report
- Version change: [TEMPLATE] → 1.0.0 (initial ratification)
- Modified principles: n/a (first concrete adoption of template)
- Added principles:
  - I. Reqord承認必須 (Approval-Gated Development)
  - II. 要件のSpec入力への反映 (Requirement Traceability into Specs)
- Added sections:
  - Reqord運用ルール (Reqord Operational Rules)
- Removed sections: [SECTION_3_NAME]/[SECTION_3_CONTENT] slot dropped (no content supplied; not needed for this project)
- Templates requiring follow-up: none — no other Spec Kit templates reference removed section
- Deferred placeholders: none
-->

# Quick Copy Ext Constitution

## Core Principles

### I. Reqord承認必須 (Approval-Gated Development)
すべての機能開発は、Reqordで承認済み(approved)ステータスのRequirement/Specificationに
紐づいていなければ着手してはならない(MUST NOT)。未承認の要件、または対応する
Requirement/Specificationが存在しない作業は開始不可。

**理由**: 実装が要件と乖離するのを防ぎ、着手前に合意された範囲でのみ開発が進むことを
保証するため。

### II. 要件のSpec入力への反映 (Requirement Traceability into Specs)
`/speckit.specify` を実行する前に、対応するReqordの要件IDを確認し、その内容を要約して
spec入力に含めなければならない(MUST)。要件IDと要約を欠いたspec作成は不可。

**理由**: 仕様書からReqord上の要件へ常に追跡可能な状態を保ち、要件とspecの内容が
乖離しないようにするため。

## Reqord運用ルール

- GitHub Issue化はReqord側(`reqord task create` / `reqord task sync`)で行う。
  `/speckit.taskstoissues` は使用してはならない(MUST NOT)。
- 実装中に当初の仕様からの変更が発生した場合、実装を即座に停止しなければならない
  (MUST)。その上で `feedback` ラベル付きのGitHub Issueを作成し、Reqordへの
  反映を提案すること。

## Governance

本憲法はプロジェクトの他のすべての慣行に優先する。改正には、変更内容の文書化、
関係者の承認、既存作業への移行方針の提示が必要。

- **改正手続き**: 変更提案はPRとして提出し、Sync Impact Reportを更新した上で
  レビュー承認を得ること。
- **バージョニング方針**: セマンティックバージョニングに従う。原則の後方非互換な
  削除・再定義はMAJOR、原則やセクションの追加はMINOR、文言修正・明確化はPATCHとする。
- **コンプライアンスレビュー**: すべてのspec・plan・PRは、本憲法(特にReqord承認要件
  および要件トレーサビリティ)への準拠を確認しなければならない(MUST)。

**Version**: 1.0.0 | **Ratified**: 2026-08-27 | **Last Amended**: 2026-08-27
