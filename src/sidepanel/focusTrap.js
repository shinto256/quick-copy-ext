// サイドパネル全面を覆うオーバーレイのフォーカス管理。
// 表示中はフォーカスをオーバーレイ内に閉じ込め、閉じたときに開く前の要素へ戻す。
// 全グループパネルと項目登録フォームの双方から使う。

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function createFocusTrap(overlayEl, options = {}) {
  const { fallbackFocus = () => null } = options;

  let active = false;
  let returnFocusEl = null;

  // フォーカス可能な要素はキー入力のたびに求める。縦リストの行数やインライン編集の
  // 有無で集合が変わるため、要素の増減を追う必要をなくすのが狙い。
  function focusableElements() {
    return Array.prototype.filter.call(
      overlayEl.querySelectorAll(FOCUSABLE_SELECTOR),
      (el) => !el.closest("[hidden]") && el.offsetParent !== null,
    );
  }

  function focusSafely(el) {
    try {
      el?.focus();
    } catch (error) {
      // 既に非表示になっている等でフォーカスできない場合は呼び出し側へ伝播させない。
    }
  }

  function handleKeydown(event) {
    if (!active || event.key !== "Tab") {
      return;
    }
    const elements = focusableElements();
    if (elements.length === 0) {
      event.preventDefault();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    const current = document.activeElement;

    if (!overlayEl.contains(current)) {
      event.preventDefault();
      focusSafely(event.shiftKey ? last : first);
      return;
    }
    if (event.shiftKey && current === first) {
      event.preventDefault();
      focusSafely(last);
      return;
    }
    if (!event.shiftKey && current === last) {
      event.preventDefault();
      focusSafely(first);
    }
    // 中間の要素にフォーカスがある場合はブラウザの既定のタブ移動に任せる。
  }

  return {
    activate(returnFocusTo = null) {
      if (active) {
        return;
      }
      returnFocusEl = returnFocusTo ?? document.activeElement;
      active = true;
      document.addEventListener("keydown", handleKeydown, true);
    },

    deactivate() {
      if (!active) {
        return;
      }
      active = false;
      document.removeEventListener("keydown", handleKeydown, true);

      // 再描画やグループ削除で記憶していた要素が失われている場合はフォールバックへ戻す。
      const target =
        returnFocusEl && document.contains(returnFocusEl) ? returnFocusEl : fallbackFocus();
      returnFocusEl = null;
      focusSafely(target);
    },

    isActive() {
      return active;
    },
  };
}
