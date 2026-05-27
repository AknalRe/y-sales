import { cva } from "class-variance-authority";

/* ======================
   TABS ROOT
====================== */

export const tabs = cva([
  "border border-border",
  "rounded-xl",
  "bg-transparent p-2",
]);

/* ======================
   TAB LIST
====================== */

export const tabList = cva(
  [
    "relative z-0",
    "flex flex-wrap gap-1",
    "px-1",
  ],
  {
    variants: {
      direction: {
        row: "",
        col: "flex-col gap-1 px-0 py-1",
      },

      appearance: {
        default: "",
        underline:
          "bg-transparent border-b border-border rounded-none px-0 py-0",
        ghost: "bg-transparent px-0 py-0",
      },
    },

    defaultVariants: {
      direction: "row",
      appearance: "default",
    },
  }
);

/* ======================
   TAB
====================== */
export const tab = cva(
  [
    "relative inline-flex items-center justify-center shrink-0",
    "h-8 px-2",
    "border-0 m-0 outline-0",
    "bg-transparent appearance-none",

    "font-medium text-sm leading-5",

    "select-none whitespace-nowrap",
    "transition-colors",
    "cursor-pointer",

    /* focus ring */
    "focus-visible:before:content-['']",
    "focus-visible:before:absolute",
    "focus-visible:before:inset-y-1",
    "focus-visible:before:inset-x-0",
    "focus-visible:before:rounded-sm",
    "focus-visible:before:outline",
    "focus-visible:before:outline-2",
    "focus-visible:before:outline-ring",
    "focus-visible:before:outline-offset-[-1px]",
  ],
  {
    variants: {
      direction: {
        row: [
          "hover:text-foreground",
        ],

        col: [
          "hover:text-muted-foreground",
          "cursor-default",
        ],
      },

      appearance: {
        default: [
          "text-tabs-text",
          "data-[active]:text-tabs-text-active",
          "hover:text-tabs-text-hover"
        ],

        underline: [
          "h-11 px-8 text-lg",

          "text-muted-foreground",
          "hover:text-foreground",

          "data-[active]:text-tabs",
        ],

        ghost: [
          "text-muted-foreground",
          "hover:text-foreground",
          "data-[active]:text-foreground",
        ],
      },
    },

    defaultVariants: {
      direction: "row",
      appearance: "default",
    },
  }
);

/* ======================
   INDICATOR
====================== */

export const indicator = cva(
  [
    "absolute -z-10",
    "rounded-sm",
    "transition-all duration-200 ease-in-out",
  ],
  {
    variants: {
      orientation: {
        row: [
          "left-0 top-1/2",
          "translate-x-[var(--active-tab-left)]",
          "translate-y-[-50%]",
          "w-[var(--active-tab-width)]",
          "h-6",
        ],

        col: [
          "top-0 left-1/2",
          "translate-y-[var(--active-tab-top)]",
          "translate-x-[-50%]",
          "h-[var(--active-tab-height)]",
          "w-full",
        ],
      },

      size: {
        sm: "h-5",
        md: "",
        lg: "h-8",
      },

      color: {
        muted: "bg-muted",
        accent: "bg-accent",
        primary: "bg-primary",
        switch: "bg-tabs",
      },

      appearance: {
        default: "",
        underline:
          "top-auto bottom-0 translate-y-0 h-[3px] rounded-none",
        ghost: "hidden",
      },
    },

    defaultVariants: {
      orientation: "row",
      size: "md",
      color: "muted",
      appearance: "default",
    },
  }
);

/* ======================
   PANEL
====================== */

export const panel = cva([
  "relative flex",
  "outline-none",
  "bg-transparent",

  "focus-visible:outline",
  "focus-visible:outline-2",
  "focus-visible:outline-ring",
  "focus-visible:outline-offset-[-1px]",
  "focus-visible:rounded-md",

  "data-[hidden]:hidden",
]);

/* ======================
   ICON
====================== */

export const icon = cva([
  "w-10 h-10",
  "text-muted-foreground",
]);