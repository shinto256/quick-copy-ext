// 縦リストの並び替え機構。Pointer Events で実装し、DOM操作とコールバックのみに依存する。
// グループの概念も永続化も持たないため、キーボード操作の後付けや項目一覧への流用ができる。
//
// HTML5 drag and drop API を使わない理由: ドラッグ画像が静止スナップショットになり
// 「移動先の行が退避する」演出を制御できず、タッチ操作にも対応しないため。
//
// 各行の位置と高さはドラッグ開始時に1回だけ計測し、以降は計測しない。挿入位置は
// 「掴んだ行の中心が、他の何行の中心を越えたか」で求めるので、行の高さが揃っていなくても
// 正しく動く（項目カードのように高さが可変のリストにも使える）。

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
    // 実際にスクロールする要素。container 自身がスクロールしない場合に渡す
    // （項目一覧はドキュメントがスクロールするため document.scrollingElement）。
    scrollContainer = container,
    // ドラッグを開始できる要素のセレクタ。省略時は行全体から開始できる（後方互換）。
    // 指定すると、ここを押した操作だけがドラッグの候補になり、行本体を押した操作は
    // タップの候補としてのみ扱われる。頻度の高いタップ操作で誤って並び替わるのを防ぐため。
    handleSelector = null,
  } = options;

  const scrollsDocument =
    scrollContainer === document.scrollingElement || scrollContainer === document.body;

  function scrollTopOf() {
    return scrollContainer.scrollTop;
  }

  // 自動スクロールの発動判定に使う可視領域。ドキュメントがスクロールする場合は
  // 要素の矩形ではなくビューポートを見る。
  function viewportBounds() {
    if (scrollsDocument) {
      return { top: 0, bottom: window.innerHeight };
    }
    const rect = scrollContainer.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  }

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
      startScrollTop: scrollTopOf(),
      pointerY: event.clientY,
      // 閾値を超えたが canDrag が false だった場合、その操作は切替として扱わない
      abandoned: false,
      // ドラッグの起点を限定している場合、押した場所がハンドルだったか。
      // pointerdown の時点で1回だけ判定し、pointermove ごとに再評価しない。
      fromHandle: handleSelector === null || Boolean(event.target.closest(handleSelector)),
    };
    row.setPointerCapture(event.pointerId);
    row.addEventListener("pointermove", handleMove);
    row.addEventListener("pointerup", handleUp);
    row.addEventListener("pointercancel", handleCancel);
  }

  // 行の位置をコンテナ内の相対オフセットとして記録する。スクロールしても変わらない値なので、
  // ドラッグ中に再計測する必要がない。
  function measureRows(targetRows) {
    const containerRect = container.getBoundingClientRect();
    const metrics = targetRows.map((row) => {
      const rect = row.getBoundingClientRect();
      return {
        row,
        top: rect.top - containerRect.top,
        height: rect.height,
      };
    });
    // 行間の余白（list の gap）。連続して並ぶリストでは 0 になる。
    const gap =
      metrics.length > 1
        ? Math.max(0, metrics[1].top - (metrics[0].top + metrics[0].height))
        : 0;
    return { metrics, gap };
  }

  function beginDrag() {
    const targetRows = rows();
    const startIndex = targetRows.indexOf(pending.row);
    if (startIndex === -1 || targetRows.length === 0) {
      pending.abandoned = true;
      return;
    }

    const { metrics, gap } = measureRows(targetRows);
    if (!metrics[startIndex].height) {
      pending.abandoned = true;
      return;
    }

    drag = {
      row: pending.row,
      pointerId: pending.pointerId,
      rows: targetRows,
      metrics,
      gap,
      startIndex,
      insertIndex: startIndex,
      startY: pending.startY,
      startScrollTop: pending.startScrollTop,
      pointerY: pending.pointerY,
      // 掴んだ行が占めていた縦方向の領域。抜けると下の行がこの分だけ繰り上がる。
      slot: metrics[startIndex].height + gap,
    };
    drag.row.classList.remove("shifting");
    drag.row.classList.add("dragging");
    autoScrollHandle = requestAnimationFrame(autoScrollStep);
    applyDragPosition();
  }

  // 掴んだ行の中心が、他の行の中心をいくつ越えたかが挿入位置になる。
  // 行の高さが揃っていなくても成り立つ。
  function insertIndexFor(offset) {
    const start = drag.metrics[drag.startIndex];
    const draggedCenter = start.top + offset + start.height / 2;
    let index = 0;
    drag.metrics.forEach((metric, i) => {
      if (i === drag.startIndex) {
        return;
      }
      if (draggedCenter > metric.top + metric.height / 2) {
        index += 1;
      }
    });
    return index;
  }

  function applyDragPosition() {
    const offset =
      drag.pointerY - drag.startY + (scrollTopOf() - drag.startScrollTop);
    drag.row.style.transform = `translateY(${offset}px)`;

    const next = insertIndexFor(offset);
    if (next === drag.insertIndex) {
      return;
    }
    drag.insertIndex = next;

    drag.metrics.forEach((metric, index) => {
      if (index === drag.startIndex) {
        return;
      }
      let shift = 0;
      if (drag.startIndex < next && index > drag.startIndex && index <= next) {
        shift = -drag.slot;
      } else if (drag.startIndex > next && index >= next && index < drag.startIndex) {
        shift = drag.slot;
      }
      metric.row.classList.add("shifting");
      metric.row.style.transform = shift ? `translateY(${shift}px)` : "";
    });
  }

  // ポインタが静止していてもスクロールが続くよう、rAFループで回す。
  function autoScrollStep() {
    if (!drag) {
      autoScrollHandle = null;
      return;
    }
    const bounds = viewportBounds();
    let delta = 0;
    if (drag.pointerY < bounds.top + AUTO_SCROLL_EDGE) {
      delta = -AUTO_SCROLL_SPEED;
    } else if (drag.pointerY > bounds.bottom - AUTO_SCROLL_EDGE) {
      delta = AUTO_SCROLL_SPEED;
    }
    if (delta !== 0) {
      const before = scrollTopOf();
      scrollContainer.scrollTop = before + delta;
      if (scrollTopOf() !== before) {
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
    // ハンドル以外から始まった操作はドラッグにしない。動かしてから離しても
    // タップ扱いにしないため、ここで無効化する。
    if (!pending.fromHandle) {
      pending.abandoned = true;
      return;
    }
    // 閾値を超えた時点で判定する。並び替えが無効なときは、この操作を切替にも使わない。
    if (!canDrag()) {
      pending.abandoned = true;
      return;
    }
    beginDrag();
  }

  // 確定後に掴んだ行が収まる位置。下へ移した場合は移動先の行の末尾、
  // 上へ移した場合は移動先の行の先頭に入る。
  function settleOffsetOf(state) {
    const start = state.metrics[state.startIndex];
    const target = state.metrics[state.insertIndex];
    if (state.insertIndex === state.startIndex) {
      return 0;
    }
    const finalTop =
      state.insertIndex > state.startIndex
        ? target.top + target.height - start.height
        : target.top;
    return finalTop - start.top;
  }

  function handleUp() {
    if (!drag) {
      const finished = pending;
      pending = null;
      if (!finished) {
        return;
      }
      releasePointer(finished.row, finished.pointerId);
      // 閾値に達しないまま離した操作はタップとして通知する（呼び出し側が切替やコピーに使う）。
      // ただしハンドルは並び替え専用の起点なので、押して離しただけでは何も起こさない。
      const fromHandleOnly = handleSelector !== null && finished.fromHandle;
      if (!finished.abandoned && !fromHandleOnly && onActivate) {
        onActivate(finished.row);
      }
      return;
    }

    const finishedDrag = drag;
    drag = null;
    pending = null;
    stopAutoScroll();
    releasePointer(finishedDrag.row, finishedDrag.pointerId);

    finishedDrag.row.classList.add("settling");
    finishedDrag.row.style.transform = `translateY(${settleOffsetOf(finishedDrag)}px)`;

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
