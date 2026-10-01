/**
 * Yentellect workbench — Splitter (Stage 1, C3).
 *
 * W3C APG Window Splitter: role="separator", aria-valuenow/min/max as the
 * primary-pane percentage, aria-controls on the primary pane, labelled by the
 * pane label. Pointer drag + arrow keys per orientation, Enter collapses or
 * restores the primary pane to its previous size.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SplitterProps {
  /** "vertical" = sits between left/right panes; "horizontal" = top/bottom. */
  orientation: "vertical" | "horizontal";
  /** Accessible name of the primary pane (becomes the separator label). */
  label: string;
  paneId: string;
  /** Current primary-pane share as 0..100 (aria-valuenow). */
  value: number;
  /** Called with a proposed 0..100 share during drag/keys. Parent clamps. */
  onChange: (value: number) => void;
  /** Whether the primary pane is currently open. */
  open: boolean;
  /** Collapse/restore the primary pane. */
  onToggle: () => void;
}

const STEP = 2;

export default function Splitter({
  orientation,
  label,
  paneId,
  value,
  onChange,
  open,
  onToggle,
}: SplitterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ start: number; base: number } | null>(null);

  const vertical = orientation === "vertical";

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragState.current = {
        start: vertical ? e.clientX : e.clientY,
        base: value,
      };
      setDragging(true);
      e.preventDefault();
    },
    [vertical, value]
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const s = dragState.current;
      if (!s) return;
      const host = ref.current?.parentElement;
      const span = vertical ? host?.clientWidth ?? 1 : host?.clientHeight ?? 1;
      const delta = ((vertical ? e.clientX : e.clientY) - s.start) / span;
      onChange(s.base + delta * 100);
    };
    const up = () => {
      dragState.current = null;
      setDragging(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("pointercancel", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, vertical, onChange]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const dec = vertical ? "ArrowLeft" : "ArrowUp";
      const inc = vertical ? "ArrowRight" : "ArrowDown";
      if (e.key === dec) {
        e.preventDefault();
        onChange(value - STEP);
      } else if (e.key === inc) {
        e.preventDefault();
        onChange(value + STEP);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onToggle();
      }
    },
    [vertical, value, onChange, onToggle]
  );

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-controls={paneId}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(open ? value : 0)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      data-dragging={dragging ? "true" : undefined}
      className={[
        "shrink-0 bg-[var(--border)] transition-colors",
        vertical ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
        "hover:bg-[var(--accent)] focus-visible:bg-[var(--accent)]",
        dragging ? "bg-[var(--accent)]" : "",
      ].join(" ")}
    />
  );
}
