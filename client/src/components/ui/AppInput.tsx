import React, { useState, useRef, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  accentColor?: string; // 'indigo' | 'emerald'
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  (
    {
      label,
      icon,
      accentColor = 'indigo',
      className = '',
      id,
      type = 'text',
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const inputId =
      id ?? label?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const glowColor =
      accentColor === 'emerald'
        ? 'rgba(16,185,129,0.35)'
        : 'rgba(99,102,241,0.35)';

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400"
          >
            {label}
          </label>
        )}
        {/* NOTE: no overflow-hidden — keeps glow border fully visible */}
        <div
          ref={wrapperRef}
          onMouseMove={handleMouseMove}
          className="relative rounded-xl group bg-white dark:bg-slate-950/50"
        >
          {/* Radial glow that tracks the mouse - Dark mode only */}
          <span
            className="pointer-events-none absolute inset-0 transition-opacity duration-300 rounded-xl hidden dark:block"
            style={{
              opacity: isFocused ? 1 : 0,
              background: `radial-gradient(120px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 80%)`,
            }}
          />
          {/* Optional leading icon */}
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 z-20 text-slate-400 dark:text-slate-500 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            className={cn(
              "relative z-10 w-full py-3 text-sm transition-all rounded-xl focus:outline-none",
              "bg-transparent border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20",
              "dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-0",
              icon ? 'pl-9 pr-4' : 'px-4',
              className
            )}
            {...props}
          />
        </div>
      </div>
    );
  }
);

AppInput.displayName = 'AppInput';
