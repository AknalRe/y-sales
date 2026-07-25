import { cva } from "class-variance-authority";

/* ======================
   Backdrop
   Meniru .admin-modal-overlay
   ====================== */
export const backdrop = cva(
  [
    "fixed inset-0 z-50",
    "flex items-center justify-center",
    "p-4",
    "bg-[var(--admin-modal-overlay)]",
    "transition-opacity duration-150 ease-[cubic-bezier(0.45,1.005,0,1.005)]",

    // animation states (Base UI dialog)
    "data-[starting-style]:opacity-0",
    "data-[ending-style]:opacity-0",
  ]
);

/* ======================
   Popup (Content)
   Meniru .admin-modal (bg surface, border, shadow, rounded)
   ====================== */
export const popup = cva(
  [
    "fixed z-50 box-border",
    "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    "flex flex-col",
    "w-full",
    "max-w-[640px]",
    "rounded-[1.5rem]",
    "border border-[var(--admin-border)]",
    "bg-[var(--admin-bg-card)]",
    "text-[var(--admin-foreground)]",
    "shadow-[var(--admin-shadow-xl)]",
    "outline-none",
    "overflow-hidden",
    "transition-all duration-150",

    // animation states (Base UI dialog)
    "data-[starting-style]:opacity-0",
    "data-[starting-style]:scale-95",
    "data-[ending-style]:opacity-0",
    "data-[ending-style]:scale-95",
  ],
  {
    variants: {
      size: {
        default: [],
        sm: ["max-w-[420px]"],
        lg: ["max-w-[860px]"],
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

/* Size max-height helper (dipisah agar bisa di-merge terpisah) */
export const maxHeight = cva(
  [],
  {
    variants: {
      size: {
        default: ["max-h-[90vh]"],
        sm: ["max-h-[85vh]"],
        lg: ["max-h-[92vh]"],
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

/* ======================
   Header
   Meniru .admin-modal-header
   ====================== */
export const header = cva(
  [
    "flex items-start justify-between gap-4",
    "p-5 sm:p-6",
  ],
  {
    variants: {
      divider: {
        true: ["border-b border-[var(--admin-border)]"],
        false: [],
      },
    },
    defaultVariants: {
      divider: true,
    },
  }
);

/* ======================
   Title
   Meniru h2 di .admin-modal-header
   ====================== */
export const title = cva(
  [
    "text-lg font-black text-[var(--admin-foreground)]",
    "leading-tight",
  ]
);

/* ======================
   Subtitle
   Meniru .admin-modal-subtitle
   ====================== */
export const subtitle = cva(
  [
    "mt-1 text-sm font-medium text-[var(--admin-muted)]",
  ]
);

/* ======================
   Close (X button)
   Meniru .admin-modal-close
   ====================== */
export const close = cva(
  [
    "grid h-9 w-9 shrink-0 place-items-center",
    "rounded-xl",
    "text-[var(--admin-muted)]",
    "transition-colors",
    "hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-foreground)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]",
    "disabled:opacity-50 disabled:pointer-events-none",
    "cursor-pointer",
  ]
);

/* ======================
   Body
   Meniru .admin-modal-body
   ====================== */
export const body = cva(
  [
    "min-h-0",
    "p-5 sm:p-6",
  ],
  {
    variants: {
      scroll: {
        true: ["overflow-y-auto"],
        false: [],
      },
    },
    defaultVariants: {
      scroll: true,
    },
  }
);

/* ======================
   Footer
   Meniru .admin-modal-footer
   ====================== */
export const footer = cva(
  [
    "flex items-center justify-end gap-2",
    "p-5 sm:p-6",
  ],
  {
    variants: {
      divider: {
        true: ["border-t border-[var(--admin-border)]"],
        false: [],
      },
    },
    defaultVariants: {
      divider: true,
    },
  }
);
