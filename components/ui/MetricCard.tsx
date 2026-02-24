"use client";
import React from "react";
import { clsx } from "clsx";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  variant?: "default" | "gold" | "emerald" | "hero";
  icon?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function MetricCard({
  label,
  value,
  subtitle,
  variant = "default",
  icon,
  className,
  size = "md",
}: MetricCardProps) {
  return (
    <div
      className={clsx(
        "glass-card rounded-2xl relative overflow-hidden",
        {
          "p-5": size === "sm",
          "p-6": size === "md",
          "p-8": size === "lg",
        },
        variant === "gold" && "border-gold-500/30",
        variant === "emerald" && "border-emerald-brand/30",
        variant === "hero" && "border-gold-500/40",
        className
      )}
    >
      {/* Glow effect */}
      {variant === "gold" && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      )}
      {variant === "emerald" && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-brand/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      )}
      {variant === "hero" && (
        <>
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-brand/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        </>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p
            className={clsx(
              "font-sans font-medium tracking-wide uppercase",
              {
                "text-xs text-white/40": size === "sm",
                "text-xs text-white/50": size === "md" || size === "lg",
              }
            )}
          >
            {label}
          </p>
          {icon && (
            <div
              className={clsx(
                "rounded-lg p-2",
                variant === "gold" && "bg-gold-500/15 text-gold-500",
                variant === "emerald" && "bg-emerald-brand/15 text-emerald-brand",
                variant === "default" && "bg-white/10 text-white/60",
                variant === "hero" && "bg-gold-500/15 text-gold-500"
              )}
            >
              {icon}
            </div>
          )}
        </div>
        <p
          className={clsx(
            "font-serif font-bold leading-none",
            {
              "text-2xl text-white": size === "sm",
              "text-3xl text-white": size === "md",
              "text-4xl": size === "lg",
            },
            variant === "gold" && "text-gold-500",
            variant === "emerald" && "text-emerald-brand",
            variant === "hero" && "text-gold-400"
          )}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-white/40 text-xs mt-2 font-sans">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
