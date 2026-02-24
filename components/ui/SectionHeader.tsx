import React from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  number?: number;
}

export function SectionHeader({ title, subtitle, number }: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-4 mb-6">
      {number !== undefined && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
          <span className="text-gold-500 text-xs font-bold font-sans">{number}</span>
        </div>
      )}
      <div>
        <h3 className="text-white font-serif font-semibold text-lg">{title}</h3>
        {subtitle && (
          <p className="text-white/40 text-sm font-sans mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
