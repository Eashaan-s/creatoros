"use client";

import { useEffect, useRef, useState } from "react";

type CursorGlowProps = {
  /** Accent RGB used for the soft radiation, e.g. "31, 111, 235" */
  color?: string;
  /** Radius of the soft glow in px */
  size?: number;
  /** Peak opacity of the glow center (keep subtle) */
  intensity?: number;
  className?: string;
};

export function CursorGlow({
  color = "31, 111, 235",
  /** ~1–1.5cm soft radius (≈38–57px); keep small and subtle */
  size = 52,
  intensity = 0.22,
  className = "",
}: CursorGlowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine && !reduce);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      el.style.setProperty("--glow-x", `${e.clientX}px`);
      el.style.setProperty("--glow-y", `${e.clientY}px`);
      el.style.opacity = "1";
    };
    const onLeave = () => {
      el.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[5] opacity-0 transition-opacity duration-200 ${className}`}
      style={{
        background: `radial-gradient(${size}px circle at var(--glow-x, -999px) var(--glow-y, -999px), rgba(${color}, ${intensity}), rgba(${color}, ${intensity * 0.35}) 45%, transparent 72%)`,
      }}
    />
  );
}
