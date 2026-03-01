"use client";
import React, { useState } from "react";

// ─── SVG fallback (approximate mark, shown until logo files are placed) ───────
function FallbackIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="#C4FF45"
        d={[
          "M 22,12 L 54,12 C 82,12 90,28 90,50 C 90,72 82,88 54,88 L 22,88 Z",
          "M 40,27 C 50,21 64,23 73,33 C 81,42 80,57 72,67 C 64,76 51,78 41,72 C 32,67 29,55 30,44 C 32,35 37,29 40,27 Z",
        ].join(" ")}
      />
      <path fill="#C4FF45" d="M 5,4 L 26,16 L 19,30 Z" />
    </svg>
  );
}

// ─── Duetto Unicorn D Icon ────────────────────────────────────────────────────
// Uses /public/duetto-icon.png when available; falls back to SVG approximation.

export function DuettoIcon({ size = 40, className }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <FallbackIcon size={size} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/duetto-icon.png"
      alt="Duetto"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", display: "block", width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

// ─── Duetto Wordmark ─────────────────────────────────────────────────────────
// Uses /public/duetto-wordmark.png when available; falls back to inline layout.

export function DuettoWordmark({
  height = 36,
  className,
}: {
  height?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center ${className ?? ""}`}
        style={{ gap: Math.round(height * 0.08) }}
      >
        <FallbackIcon size={height} />
        <span
          style={{
            color: "#C4FF45",
            fontSize: Math.round(height * 0.74),
            fontWeight: 800,
            fontFamily: '"DM Sans", system-ui, sans-serif',
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          uetto
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/duetto-wordmark.png"
      alt="Duetto"
      height={height}
      className={className}
      style={{ objectFit: "contain", height, width: "auto", display: "block" }}
      onError={() => setFailed(true)}
    />
  );
}
