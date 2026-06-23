"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

const componentThemeClassName =
  "[--ic-background:#0A0A0A] [--ic-foreground:#F5F5F5] [--ic-card:rgba(10,10,10,0.9)] [--ic-card-foreground:#F5F5F5] [--ic-border:rgba(255,255,255,0.1)] [--ic-brand:#6B9E8A] [--ic-brand-foreground:#08090A]";

type OriginButtonProps = {
  href?: string;
  variant?: "default" | "solid" | "handle";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className">;

const variantClassNames = {
  default:
    "border border-[var(--ic-border)] bg-[var(--ic-card)] text-[var(--ic-card-foreground)] shadow-lg hover:shadow-xl",
  solid:
    "border border-transparent bg-[var(--ic-brand)] text-[var(--ic-brand-foreground)] shadow-[0_0_20px_rgba(107,158,138,0.18)]",
  handle:
    "border border-transparent bg-white text-neutral-900 shadow-lg",
};

function OriginButton({
  href,
  variant = "default",
  disabled = false,
  type = "button",
  className,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: OriginButtonProps) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [origin, setOrigin] = React.useState({ x: 50, y: 50 });
  const [active, setActive] = React.useState(false);

  const updateOrigin = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  const handlePointerEnter = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      updateOrigin(event);
      setActive(true);
      onPointerEnter?.(event);
    },
    [onPointerEnter, updateOrigin],
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      updateOrigin(event);
      onPointerMove?.(event);
    },
    [onPointerMove, updateOrigin],
  );

  const handlePointerLeave = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      setActive(false);
      onPointerLeave?.(event);
    },
    [onPointerLeave],
  );

  const handleFocus = React.useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setOrigin({ x: rect.width / 2, y: rect.height / 2 });
      setActive(true);
      onFocus?.(event);
    },
    [onFocus],
  );

  const handleBlur = React.useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      setActive(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  const sharedClassName = cn(
    componentThemeClassName,
    "group relative inline-flex isolate items-center justify-center overflow-hidden whitespace-nowrap rounded-full font-medium no-underline outline-none transition-all duration-200",
    "focus-visible:ring-2 focus-visible:ring-[var(--ic-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ic-background)]",
    "disabled:pointer-events-none disabled:opacity-50",
    variantClassNames[variant],
    className,
  );

  const content = (
    <>
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute h-48 w-48 rounded-full bg-[var(--ic-brand)]"
        initial={false}
        animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        style={{
          left: origin.x,
          top: origin.y,
          translateX: "-50%",
          translateY: "-50%",
        }}
      />
      <span className="relative z-10 inline-flex items-center justify-center">
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        className={sharedClassName}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      disabled={disabled}
      className={sharedClassName}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}

export { OriginButton };
