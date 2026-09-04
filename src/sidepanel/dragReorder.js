// 縦リストの並び替え機構。Pointer Events で実装し、DOM操作とコールバックのみに依存する。
// グループの概念も永続化も持たないため、キーボード操作の後付けや項目一覧への流用ができる。
//
// HTML5 drag and drop API を使わない理由: ドラッグ画像が静止スナップショットになり
// 「移動先の行が退避する」演出を制御できず、タッチ操作にも対応しないため。
//
// 挿入位置は「移動量 ÷ 行高」の算術で求める。行高はドラッグ開始時に1回だけ計測するので、
// pointermove ごとの矩形計測が不要になる（行の高さが一定であることが前提）。

const DEFAULT_THRESHOLD = 5;
const AUTO_SCROLL_EDGE = 30;
const AUTO_SCROLL_SPEED = 11;
const SETTLE_DURATION = 180;

export function attachDragReorder(container, options) {
  const {
    rowSelector,
    ignoreSelector = null,
    threshold = DEFAULT_THRESHOLD,
    canDrag = () => true,
    onActivate = null,
    onReorder,
  } = options;

  // 押している間だけ存在する状態。null ならポインタを掴んでいない。
  let pending = null;
  let drag = null;
  let autoScrollHandle = null;

  function rows() {
    return Array.prototype.slice.call(container.querySelectorAll(rowSelector));
  }

  function clearRowStyles(targetRows) {
    for (const row of targetRows) {
      row.classList.remove("dragging", "shifting", "settling");
      row.style.transform = "";
    }
  }

  function stopAutoScroll() {
    if (autoScrollHandle !== null) {
      cancelAnimationFrame(autoScrollHandle);
      autoScrollHandle = null;
    }
  }

  function releasePointer(row, pointerId) {
    if (row.hasPointerCapture?.(pointerId)) {
      row.releasePointerCapture(pointerId);
    }
    row.removeEventListener("pointermove", handleMove);
    row.removeEventListener("pointerup", handleUp);
    row.removeEventListener("pointercancel", handleCancel);
  }

  function handleDown(event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }
    const row = event.target.closest(rowSelector);
    if (!row || !container.contains(row)) {
      return;
    }
    // 行内の操作（三点リーダーなど）はドラッグもタップ通知も発生させない。
    if (ignoreSelector && event.target.closest(ignoreSelector)) {
      return;
    }

    event.preventDefault();
    pending = {
      row,
      pointerId: event.pointerId,
      startY: event.clientY,
      startX: event.clientX,
      startScrollTop: container.scrollTop,
      pointerY: event.clientY,
      // 閾値を超えたが canDrag が false だった場合、その操作は切替として扱わない
      abandoned: false,
    };
    row.setPointerCapture(event.pointerId);
    row.addEventListener("pointermove", handleMove);
    row.addEventListener("pointerup", handleUp);
    row.addEventListener("pointercancel", handleCancel);
  }

  function beginDrag() {
    const targetRows = rows();
    const startIndex = targetRows.indexOf(pending.row);
    if (startIndex === -1 || targetRows.length === 0) {
      pending.abandoned = true;
      return;
    }

    // 行高はここで1回だけ計測する。CSS側を唯一の情報源にでき、ズームやフォント変更にも追従する。
    const rowHeight = targetRows[0].getBoundingClientRect().height;
    if (!rowHeight) {
      pending.abandoned = true;
      return;
    }

    drag = {
      row: pending.row,
      pointerId: pending.pointerId,
      rows: targetRows,
      startIndex,
      insertIndex: startIndex,
      startY: pending.startY,
      startScrollTop: pending.startScrollTop,
      pointerY: pending.pointerY,
      rowHeight,
    };
    drag.row.classList.remove("shifting");
    drag.row.classList.add("dragging");
    autoScrollHandle = requestAnimationFrame(autoScrollStep);
    applyDragPosition();
  }

  function applyDragPosition() {
    const offset =
      drag.pointerY - drag.startY + (container.scrollTop - drag.startScrollTop);
    drag.row.style.transform = `translateY(${offset}px)`;

    let next = drag.startIndex + Math.round(offset / drag.rowHeight);
    next = Math.max(0, Math.min(drag.rows.length - 1, next));
    if (next === drag.insertIndex) {
      return;
    }
    drag.insertIndex = next;

    drag.rows.forEach((row, index) => {
      if (row === drag.row) {
        return;
      }
      let shift = 0;
      if (drag.startIndex < next && index > drag.startIndex && index <= next) {
        shift = -drag.rowHeight;
      } else if (drag.startIndex > next && index >= next && index < drag.startIndex) {
        shift = drag.rowHeight;
      }
      row.classList.add("shifting");
      row.style.transform = shift ? `translateY(${shift}px)` : "";
    });
  }

  // ポインタが静止していてもスクロールが続くよう、rAFループで回す。
  function autoScrollStep() {
    if (!drag) {
      autoScrollHandle = null;
      return;
    }
    const rect = container.getBoundingClientRect();
    let delta = 0;
    if (drag.pointerY < rect.top + AUTO_SCROLL_EDGE) {
      delta = -AUTO_SCROLL_SPEED;
    } else if (drag.pointerY > rect.bottom - AUTO_SCROLL_EDGE) {
      delta = AUTO_SCROLL_SPEED;
    }
    if (delta !== 0) {
      const before = container.scrollTop;
      container.scrollTop += delta;
      if (container.scrollTop !== before) {
        applyDragPosition();
      }
    }
    autoScrollHandle = requestAnimationFrame(autoScrollStep);
  }

  function handleMove(event) {
    if (drag) {
      drag.pointerY = event.clientY;
      applyDragPosition();
      return;
    }
    if (!pending || pending.abandoned) {
      return;
    }
    pending.pointerY = event.clientY;
    const moved = Math.hypot(
      event.clientX - pending.startX,
      event.clientY - pending.startY,
    );
    if (moved < threshold) {
      return;
    }
    // 閾値を超えた時点で判定する。並び替えが無効なときは、この操作を切替にも使わない。
    if (!canDrag()) {
      pending.abandoned = true;
      return;
    }
    beginDrag();
  }

  function handleUp() {
    if (!drag) {
      const finished = pending;
      pending = null;
      if (!finished) {
        return;
      }
      releasePointer(finished.row, finished.pointerId);
      // 閾値に達しないまま離した操作はグループ切替として扱う。
      if (!finished.abandoned && onActivate) {
        onActivate(finished.row);
      }
      return;
    }

    const finishedDrag = drag;
    drag = null;
    pending = null;
    stopAutoScroll();
    releasePointer(finishedDrag.row, finishedDrag.pointerId);

    const settleOffset =
      (finishedDrag.insertIndex - finishedDrag.startIndex) * finishedDrag.rowHeight;
    finishedDrag.row.classList.add("settling");
    finishedDrag.row.style.transform = `translateY(${settleOffset}px)`;

    // アニメーション中はDOMを触らない。確定時のレイアウト変化でカクつかせないため。
    setTimeout(() => {
      const ordered = [...finishedDrag.rows];
      ordered.splice(finishedDrag.startIndex, 1);
      ordered.splice(finishedDrag.insertIndex, 0, finishedDrag.row);
      for (const row of ordered) {
        container.appendChild(row);
      }
      clearRowStyles(ordered);
      onReorder(ordered);
    }, SETTLE_DURATION + 10);
  }

  function handleCancel() {
    const finishedDrag = drag;
    const finished = pending;
    drag = null;
    pending = null;
    stopAutoScroll();
    if (finishedDrag) {
      releasePointer(finishedDrag.row, finishedDrag.pointerId);
      clearRowStyles(finishedDrag.rows);
    } else if (finished) {
      releasePointer(finished.row, finished.pointerId);
    }
  }

  container.addEventListener("pointerdown", handleDown);

  return function detach() {
    handleCancel();
    container.removeEventListener("pointerdown", handleDown);
  };
}
