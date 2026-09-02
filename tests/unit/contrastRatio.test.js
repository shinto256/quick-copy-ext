import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = fileURLToPath(new URL("../../src/sidepanel/sidepanel.css", import.meta.url));
const css = readFileSync(cssPath, "utf8");

function extractColorTokens(blockPattern) {
  const block = css.match(blockPattern);
  if (!block) {
    throw new Error(`色トークンのブロックが見つかりません: ${blockPattern}`);
  }
  const tokens = {};
  for (const [, name, value] of block[1].matchAll(/--(color-[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[name] = value.trim();
  }
  return tokens;
}

const LIGHT = extractColorTokens(/(?:^|\n):root\s*\{([\s\S]*?)\n\}/);
const DARK = extractColorTokens(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
const DARK_MEDIA = extractColorTokens(
  /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{([\s\S]*?)\n {2}\}/,
);

function toChannels(hex) {
  const normalized = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(normalized.slice(i, i + 2), 16));
}

function relativeLuminance(hex) {
  const channels = toChannels(hex).map((v) => v / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/** 半透明のオーバーレイを不透明な背景に重ねた実効色を求める */
function composite(rgbaOverlay, baseHex) {
  const [, r, g, b, alpha] = rgbaOverlay.match(
    /rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/,
  );
  const overlay = [r, g, b].map(Number);
  const base = toChannels(baseHex);
  const a = Number(alpha);
  return (
    "#" +
    base
      .map((value, i) =>
        Math.round(a * overlay[i] + (1 - a) * value)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/**
 * 画面上で実際に組み合わさる前景色と背景色のペア。
 * 面同士の色差(タブ背景と地など)は WCAG 1.4.11 の対象外のため含めない。
 * 定義: specs/004-dads-ui-refresh/contracts/design-tokens.md 2節
 */
const PAIRS = [
  ["本文 (項目名/ラベル/選択件数)", "color-text", "color-bg", 4.5],
  ["本文 on カード面", "color-text", "color-surface", 4.5],
  ["本文 on ホバー面 (メニュー項目)", "color-text", "color-surface-hover", 4.5],
  ["補助テキスト (空状態/補助ラベル)", "color-text-muted", "color-bg", 4.5],
  ["補助テキスト (項目の値)", "color-text-muted", "color-surface", 4.5],
  ["補助テキスト on ホバー面", "color-text-muted", "color-surface-hover", 4.5],
  ["アクセント文字 (選択中のタブ/テーマ)", "color-accent", "color-bg", 4.5],
  ["アクセント文字 on カード面", "color-accent", "color-surface", 4.5],
  ["アクセント文字 on ホバー面 (選択中のテーマ)", "color-accent", "color-surface-hover", 4.5],
  ["保存ボタンの文字 on アクセント背景", "color-accent-contrast", "color-accent", 4.5],
  ["成功メッセージ", "color-success", "color-bg", 4.5],
  ["コピー成功アイコン on カード面", "color-success", "color-surface", 3],
  ["コピー成功アイコン on ホバー面", "color-success", "color-surface-hover", 3],
  ["エラーメッセージ", "color-error", "color-bg", 4.5],
  ["エラー文字 on カード面 (削除ボタン)", "color-error", "color-surface", 4.5],
  ["警告", "color-warning", "color-bg", 4.5],
  ["非選択タブの文字", "color-text-muted", "color-tab-bg", 4.5],
  ["選択タブの文字", "color-accent", "color-tab-active-bg", 4.5],
  ["境界線 on 地", "color-border", "color-bg", 3],
  ["境界線 on カード面", "color-border", "color-surface", 3],
  ["境界線 on ホバー面", "color-border", "color-surface-hover", 3],
];

/**
 * DADS指定のフォーカス表現。テーマによらず固定の二重構造。
 * 黒の外周はライト地で、Yellow-300 はダーク地で視認を担保するため、
 * 「二層のうち少なくとも一層が地に対し3:1以上」を判定条件とする。
 * 根拠: specs/004-dads-ui-refresh/research.md R5
 */
const FOCUS_LAYERS = ["#000000", "#ffd43d"];

describe.each([
  ["ライトテーマ", LIGHT],
  ["ダークテーマ", DARK],
])("%s のコントラスト比 (SC-001 / FR-002 / FR-003)", (_themeName, tokens) => {
  it.each(PAIRS)("%s は %s / %s で必要比 %d 以上", (_role, fg, bg, required) => {
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    expect(
      ratio,
      `--${fg} (${tokens[fg]}) on --${bg} (${tokens[bg]}) = ${ratio.toFixed(2)} で、必要な ${required} に ${(required - ratio).toFixed(2)} 足りません`,
    ).toBeGreaterThanOrEqual(required);
  });

  // アイコンボタンのホバー背景は半透明のため、カード面とカードのホバー面の
  // 双方に重ねた実効色に対して基準を満たす必要がある。
  it.each([
    ["カード面", "color-surface"],
    ["カードのホバー面", "color-surface-hover"],
  ])("アイコンボタンのホバー背景(%s上)でも前景が視認できる", (_label, baseToken) => {
    const effective = composite(tokens["color-hover-overlay"], tokens[baseToken]);
    const ratio = contrastRatio(tokens["color-text"], effective);
    expect(
      ratio,
      `--color-text (${tokens["color-text"]}) on ${effective} (= --${baseToken} + ホバー背景) = ${ratio.toFixed(2)}`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("フォーカス表示の二層のうち少なくとも一層が地に対して視認できる (FR-017)", () => {
    const background = tokens["color-bg"];
    const ratios = FOCUS_LAYERS.map((layer) => contrastRatio(layer, background));
    const detail = FOCUS_LAYERS.map(
      (layer, i) => `${layer} = ${ratios[i].toFixed(2)}`,
    ).join(", ");
    expect(
      Math.max(...ratios),
      `--color-bg (${background}) に対するフォーカス二層のコントラスト比: ${detail}`,
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("色トークンの定義 (FR-006)", () => {
  it("ライトとダークで同じトークンが定義されている", () => {
    expect(Object.keys(DARK).sort()).toEqual(Object.keys(LIGHT).sort());
  });

  it("ダークの定義が prefers-color-scheme と data-theme で一致する", () => {
    expect(DARK_MEDIA).toEqual(DARK);
  });

  it("すべての色トークンが16進表記かrgba表記である", () => {
    for (const [name, value] of Object.entries(LIGHT)) {
      expect(value, `--${name} の値が想定外の形式です: ${value}`).toMatch(
        /^(#[0-9a-f]{6}|rgba\([\d\s,.]+\))$/,
      );
    }
  });
});

describe("書体トークン (FR-010 / FR-012)", () => {
  const rootBlock = css.match(/(?:^|\n):root\s*\{([\s\S]*?)\n\}/)[1];

  it("フォントサイズがすべて14px以上である", () => {
    const sizes = [...rootBlock.matchAll(/--font-size-[\w-]+\s*:\s*(\d+)px;/g)].map((m) =>
      Number(m[1]),
    );
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      expect(size, `${size}px のフォントサイズトークンが定義されています`).toBeGreaterThanOrEqual(14);
    }
  });

  it("本文の行間が1.5以上である", () => {
    const bodyLineHeight = rootBlock.match(/--line-height-body\s*:\s*([\d.]+);/);
    expect(bodyLineHeight).not.toBeNull();
    expect(Number(bodyLineHeight[1])).toBeGreaterThanOrEqual(1.5);
  });
});

describe("スタイル指定の制約 (FR-010 / FR-011)", () => {
  it("14px未満のフォントサイズ指定が存在しない", () => {
    const violations = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)]
      .map((m) => Number(m[1]))
      .filter((size) => size < 14);
    expect(violations, `14px未満の指定: ${violations.join(", ")}`).toEqual([]);
  });

  it("font-weight の指定が400と700のみである", () => {
    const weights = [...css.matchAll(/font-weight:\s*([^;]+);/g)]
      .map((m) => m[1].trim())
      .filter((value) => value !== "400 700");
    const invalid = weights.filter((value) => value !== "400" && value !== "700");
    expect(invalid, `400/700以外の指定: ${invalid.join(", ")}`).toEqual([]);
  });
});
