# Specification Quality Checklist: 項目カードの並び替えハンドル

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-04
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- 検証は1回のイテレーションで全項目パスした。
- **User Story 1 と 2 をどちらも P1 にしている**。US1（カード本体からのドラッグを止める）だけを実装すると並び替えの手段が失われ、US2（掴み手の追加）だけを実装するとカード本体からのドラッグが残って誤操作が解消しない。2つは同時に満たす必要があるため、優先度に差を付けなかった。この理由を各ストーリーの「Why this priority」に明記している。
- **カードとグループの縦リストで起点の扱いが異なる点を Assumptions で意図的な差と明記した**。カードは本体を押すとコピー（頻度が高い）、グループの行は本体を押すと切替（頻度が低く代償も小さい）という違いが根拠。FR-014 でグループ側の挙動を変えないことを要件化している。
- 「No implementation details」について: 当たり判定の具体的な大きさ、ドラッグ起点を限定する仕組みの実現方法はいずれも Assumptions で計画・実装フェーズ送りとしており、FR と SC は振る舞いのみで記述している。
- FR と受け入れ条件の対応: FR-001〜FR-005（掴み手の表示）は US2 のシナリオ1・2・7・8、FR-006〜FR-012（ドラッグの起点）は US1 の全シナリオと US2 のシナリオ3〜6、FR-013 / FR-014（変更しないもの）は SC-007 / SC-008 に対応。
- 回帰の防止を SC-007（キーボード）と SC-008（グループ側）の2つに分けて立てている。本specはポインタ操作の起点だけを変える変更であり、それ以外に影響が出ていないことを別々に確認する必要があるため。
- 「カードの高さを変えない」を FR-004 / SC-006 として要件化した。ドラッグの機構は行の高さを計測して挿入位置を求めるため、掴み手の追加で高さが変わると挿入位置の提示が狂う。見た目の問題ではなく機能の前提条件。
