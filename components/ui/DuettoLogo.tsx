"use client";
import React from "react";

// ─── Duetto Unicorn D Icon ────────────────────────────────────────────────────
// Renders the stylised Duetto D mark with unicorn head negative space and horn.
// viewBox 0 0 100 100; rendered square at `size` px.

export function DuettoIcon({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/*
        D body — a solid filled D with the unicorn head subtracted via even-odd rule.
        Outer path (CW) fills the whole D.
        Inner path creates the unicorn-head-shaped negative space (dark cutout).
      */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="#C4FF45"
        d={[
          // Outer D letterform
          "M 22,12 L 54,12 C 82,12 90,28 90,50 C 90,72 82,88 54,88 L 22,88 Z",
          // Unicorn head silhouette (negative space): horse profile facing right.
          // Mane/back-of-head on the left, face/muzzle on the right, neck at bottom-left.
          "M 40,27"
          + " C 50,21 64,23 73,33"    // forehead sweeping right
          + " C 81,42 80,57 72,67"    // face going down (right side)
          + " C 64,76 51,78 41,72"    // chin / lower jaw going left
          + " C 32,67 29,55 30,44"    // throat / neck going up-left
          + " C 32,35 37,29 40,27 Z", // mane / back of head
        ].join(" ")}
      />

      {/*
        Horn — a narrow triangle extending diagonally from the upper-left of the D.
        Tip at (5, 4); base runs along the upper-left edge of the D letterform.
      */}
      <path
        fill="#C4FF45"
        d="M 5,4 L 26,16 L 19,30 Z"
      />
    </svg>
  );
}

// ─── Duetto Wordmark ─────────────────────────────────────────────────────────
// Full logo: unicorn D icon + "uetto" text in Lucent Green.
// The icon naturally forms the "D" of "Duetto".

export function DuettoWordmark({
  height = 36,
  className,
}: {
  height?: number;
  className?: string;
}) {
  const fontSize = Math.round(height * 0.74);

  return (
    <div
      className={`flex items-center ${className ?? ""}`}
      style={{ gap: Math.round(height * 0.08) }}
    >
      <DuettoIcon size={height} />
      <span
        style={{
          color: "#C4FF45",
          fontSize,
          fontWeight: 800,
          fontFamily: '"DM Sans", system-ui, sans-serif',
          letterSpacing: "-0.03em",
          lineHeight: 1,
          paddingBottom: 1,
        }}
      >
        uetto
      </span>
    </div>
  );
}
