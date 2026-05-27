import { cva } from "class-variance-authority";

export const headerIcon = cva(
  "flex items-center justify-center shrink-0",
  {
    variants: {
      appearance: {
        default: "",
        bg: "w-8 h-8 rounded-md bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      appearance: "default",
    },
  }
);