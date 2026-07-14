import { cva } from "class-variance-authority";

/* =========================
   Form
========================= */
export const form = cva(
  "flex flex-col gap-4 w-full"
);

/* =========================
   Field
========================= */
export const field = cva(
  "flex flex-col items-start gap-1"
);

/* =========================
   Label
   ========================= */
export const label = cva(
  "text-sm font-medium leading-5 text-foreground"
);

/* =========================
   Input
   ========================= */
export const input = cva(
  [
    "box-border w-full h-10 px-3.5",
    "rounded-sm border border-border",
    "bg-transparent text-foreground text-base font-normal",
    "placeholder:text-muted-foreground",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-[-1px]",
    // dark
    "dark:bg-transparent",
    "dark:placeholder:text-muted-foreground",
  ],
  {
    variants: {
      state: {
        default: "",
        error: [
          "border-destructive focus:ring-destructive",
        ].join(" "),
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

/* =========================
   Error
========================= */
export const errorText = cva(
  [
    "text-sm leading-5 text-red-800",
    "dark:text-red-400"
  ]
);

/* =========================
   Action
========================= */
export const action = cva(
  "flex justify-end mt-4 gap-2"
);

/* =========================
   Button
   ========================= */
export const button = cva(
  [
    "box-border inline-flex items-center justify-center",
    "select-none",
    "h-10 px-3.5",
    "rounded-md border",
    "bg-muted text-foreground",
    "text-base font-medium leading-6",
    "transition-colors",

    // hover & active
    "hover:bg-muted/80",

    // focus
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-[-1px]",

    // disabled (Base UI)
    "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        default: "border-border",
        primary: "bg-primary text-primary-foreground border-primary hover:bg-primary/80",
        outline: "bg-transparent border-border hover:bg-muted text-foreground",
      },
      size: {
        sm: "h-8 px-2.5 text-sm",
        md: "h-10 px-3.5 text-base",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);
