"use client";
import React from "react";
import { clsx } from "clsx";

interface InputFieldProps {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

export function InputField({ label, tooltip, children, className, required }: InputFieldProps) {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wider font-sans">
          {label}
          {required && <span className="text-gold-500 ml-1">*</span>}
        </label>
        {tooltip && (
          <div className="tooltip">
            <svg className="w-3.5 h-3.5 text-white/30 cursor-help" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div className="tooltip-text">{tooltip}</div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
  suffix?: string;
}

export function TextInput({ prefix, suffix, className, ...props }: TextInputProps) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-white/40 text-sm font-sans pointer-events-none z-10">
          {prefix}
        </span>
      )}
      <input
        {...props}
        className={clsx(
          "w-full bg-navy-800/60 border border-white/10 rounded-xl",
          "text-white font-sans text-sm placeholder-white/20",
          "focus:outline-none focus:border-gold-500/50 focus:bg-navy-800/80",
          "transition-all duration-200",
          "py-3",
          prefix ? "pl-8 pr-4" : "px-4",
          suffix ? "pr-12" : "",
          className
        )}
      />
      {suffix && (
        <span className="absolute right-3 text-white/40 text-sm font-sans pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function SelectInput({
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full bg-navy-800/60 border border-white/10 rounded-xl",
        "text-white font-sans text-sm",
        "focus:outline-none focus:border-gold-500/50 focus:bg-navy-800/80",
        "transition-all duration-200",
        "py-3 px-4",
        className
      )}
    >
      {children}
    </select>
  );
}

interface SliderInputProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (v: number) => string;
  label?: string;
}

export function SliderInput({
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue,
}: SliderInputProps) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-white/30">{formatValue ? formatValue(min) : min}</span>
        <span className="text-sm font-semibold text-gold-400 font-sans">
          {formatValue ? formatValue(value) : value}
        </span>
        <span className="text-xs text-white/30">{formatValue ? formatValue(max) : max}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, #C4FF45 0%, #C4FF45 ${percent}%, rgba(255,255,255,0.1) ${percent}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
      </div>
    </div>
  );
}

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
}

export function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={clsx(
            "text-2xl transition-all duration-150",
            star <= value ? "text-gold-500" : "text-white/15 hover:text-gold-500/50"
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}
