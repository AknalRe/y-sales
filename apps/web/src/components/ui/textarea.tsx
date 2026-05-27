import * as React from "react"
import { cn } from "@/utils/lib/utils"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  label?: React.ReactNode
}

function Textarea({ className, label, id, ...props }: TextareaProps) {
  const generatedId = React.useId()
  const textareaId = id || generatedId
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 min-h-[80px] w-full rounded-md border bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] focus-visible:ring-[3px] aria-invalid:ring-[3px] md:text-sm placeholder:text-muted-foreground outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { Textarea }

