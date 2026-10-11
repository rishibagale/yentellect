/**
 * Yentellect workbench — narrow-viewport notice (Stage 1 + Package 4).
 * Minimum supported width 1024px; below that show a plain notice.
 * Phone: full-screen notice. Tablet: banner at top.
 */
"use client";

interface MinWidthNoticeProps {
  isPhone?: boolean;
}

export default function MinWidthNotice({ isPhone = true }: MinWidthNoticeProps) {
  if (isPhone) {
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
  // Tablet: show as banner
  return (
    <div
      role="alert"
      className="w-full border-b border-[var(--border)] bg-[var(--bg-1)] px-4 py-2 text-center"
    >
      <p className="text-sm text-[var(--text-dim)]">
        Yentellect works best at 1024px+. Some panels may be hidden — use the
        floating buttons to open Lens or Explorer.
      </p>
    </div>
  );
}
