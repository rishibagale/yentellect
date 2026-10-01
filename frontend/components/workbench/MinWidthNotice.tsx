/**
 * Yentellect workbench — narrow-viewport notice (Stage 1).
 * Minimum supported width 1024px; below that show a plain notice.
 */
"use client";

export default function MinWidthNotice() {
  return (
    <div
      role="alert"
      className="h-screen w-screen flex items-center justify-center bg-[var(--bg-0)] px-6 text-center"
    >
      <p className="max-w-sm text-sm text-[var(--text-dim)]">
        Yentellect needs at least 1024px of width. Resize the window or use a
        larger display.
      </p>
    </div>
  );
}
