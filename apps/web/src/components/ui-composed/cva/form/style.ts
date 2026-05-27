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
  [
    "text-sm font-medium leading-5 text-gray-900",
    "dark:text-gray-100"
  ]
);

/* =========================
   Input
========================= */
export const input = cva(
  [
    "box-border w-full h-10 px-3.5",
    "rounded-sm border border-gray-200",
    "bg-transparent text-gray-900 text-base font-normal",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-[-1px]",
    // dark
    "dark:bg-transparent",
    "dark:text-gray-100",
    "dark:border-[#232323]",
    "dark:placeholder-gray-500",
  ],
  {
    variants: {
      state: {
        default: "",
        error: [
          "border-red-500 focus:ring-red-500",
          "dark:border-red-600 dark:focus:ring-red-600",
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
    "rounded-md border border-gray-200",
    "bg-gray-50 text-gray-900 text-base font-medium leading-6",
    "transition-colors",

    // hover & active
    "hover:bg-gray-100",
    "active:bg-gray-200 active:shadow-inner active:border-t-gray-300",

    // focus
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[-1px]",

    // disabled (Base UI)
    "data-[disabled]:text-gray-500 data-[disabled]:pointer-events-none",

    // dark
    "dark:bg-[#141414]",
    "dark:text-gray-100",
    "dark:border-[#232323]",
    "dark:hover:bg-[#181818]",
    "dark:active:bg-[#181818]",
    // primary handled below for dark variant
  ],
  {
    variants: {
      variant: {
        default: "",
        primary: [
          "bg-blue-500 text-white hover:bg-blue-600 border-blue-500",
          "dark:bg-blue-600 dark:hover:bg-blue-700",
          "dark:border-blue-600",
          "dark:text-white"
        ].join(" "),
        outline: [
          "bg-transparent border-gray-400 hover:bg-gray-100",
          "dark:bg-transparent",
          "dark:border-gray-600",
          "dark:hover:bg-[#181818]"
        ].join(" "),
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
