import { cva } from "class-variance-authority";

/* ======================
   Button
====================== */
export const button = cva(
  [
    "box-border inline-flex items-center justify-center",
    "h-10 px-3.5",
    "rounded-md border border-[var(--color-border)]",
    "bg-[var(--color-muted)] text-[var(--color-foreground)]",
    "font-medium text-base leading-6",
    "select-none",
    "transition-colors",
    "cursor-pointer", 

    // hover & active
    "hover:bg-[rgb(from_var(--color-muted-foreground)_r_g_b/_0.06)]",
    "active:bg-[rgb(from_var(--color-muted-foreground)_r_g_b/_0.10)]",

    // focus
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-[-1px]",
  ]
);

/* ======================
   Backdrop
====================== */
export const backdrop = cva(
  [
    "fixed inset-0 z-10",
    "min-h-[100dvh]",
    "bg-black opacity-20",
    "dark:opacity-70",
    "transition-opacity duration-150 ease-[cubic-bezier(0.45,1.005,0,1.005)]",

    // animation states
    "data-[starting-style]:opacity-0",
    "data-[ending-style]:opacity-0",
  ]
);

/* ======================
   Popup
====================== */
export const popup = cva(
  [
    "fixed z-10",
    "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    "w-96 max-w-[calc(100vw-3rem)] overflow-y-auto",
    "max-h-[calc(100dvh-3rem)]", 
    "p-6",
    "rounded-lg",
    "outline outline-1 outline-[var(--color-border)]",
    "bg-[var(--color-card)] text-[var(--color-card-foreground)]",
    "transition-all duration-150",

    // dark: All handled by vars

    // animation states
    "data-[starting-style]:opacity-0",
    "data-[starting-style]:scale-90",
    "data-[ending-style]:opacity-0",
    "data-[ending-style]:scale-90",
  ]
);

/* ======================
   Title
====================== */
export const title = cva(
  [
    "text-lg leading-7",
    "font-medium tracking-[-0.0025em]",
    "text-[var(--color-card-foreground)]",
  ]
);

/* ======================
   Description
====================== */
export const description = cva(
  [
    "mb-6",
    "text-base leading-6",
    "text-[var(--color-muted-foreground)]",
  ]
);

/* ======================
   Actions
====================== */
export const actions = cva(
  [
    "flex justify-end gap-2"
  ]
);
