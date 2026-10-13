import type { ComponentProps } from "react";

type ActionButtonProps = Omit<ComponentProps<"button">, "className">;

export function ActionButton({ children, style, ...props }: ActionButtonProps) {
  return (
    <button
      type="button"
      style={style}
      {...props}
      className="
        group relative isolate inline-flex shrink-0 items-center justify-center
        h-9 px-4 py-2

        overflow-hidden
        rounded-md
        border-0

        cursor-pointer
        disabled:cursor-not-allowed disabled:opacity-50

        [--btn:#d1fe17]
        [--btn-edge:color-mix(in_oklab,#d1fe17,black_65%)]
        bg-gradient-to-b
        from-[color-mix(in_oklab,var(--btn),white_10%)]
        via-[var(--btn)]
        to-[color-mix(in_oklab,var(--btn),black_8%)]

        text-sm
        font-medium
        whitespace-nowrap
        text-black

        outline-none
        focus-visible:ring-[3px] focus-visible:ring-ring/50

        shadow-[0_3px_0_var(--btn-edge),0_6px_10px_color-mix(in_oklab,var(--btn-edge),transparent_30%)]
        hover:shadow-[0_4px_0_var(--btn-edge),0_8px_14px_color-mix(in_oklab,var(--btn-edge),transparent_25%)]
        active:shadow-[0_1px_0_var(--btn-edge),0_2px_4px_color-mix(in_oklab,var(--btn-edge),transparent_35%)]

        transition-all duration-150

        hover:-translate-y-px
        active:translate-y-0.5
        disabled:hover:translate-y-0 disabled:active:translate-y-0
      "
    >
      {/* Glass highlight */}
      <span
        className="
          pointer-events-none
          absolute inset-px
          rounded-[5px]

          bg-gradient-to-b
          from-white/40
          via-transparent
          to-transparent

          shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),inset_0_-1px_2px_rgba(60,80,0,0.35)]
        "
      />

      {/* Fingerprint texture */}
      <span
        className="
          pointer-events-none
          absolute inset-0
          rounded-[inherit]

          opacity-40
          mix-blend-overlay

          [background:repeating-radial-gradient(ellipse_at_25%_55%,transparent_0,transparent_2px,rgba(255,255,255,.22)_2.5px,transparent_3.5px,transparent_5px),repeating-radial-gradient(ellipse_at_78%_55%,transparent_0,transparent_2px,rgba(255,255,255,.18)_2.5px,transparent_3.5px,transparent_5px)]
        "
      />

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}