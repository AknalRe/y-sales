import React, { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";

import { Field, FieldLabel, SelectChevronUpDownIcon } from "../select-field";
import styles from "./index.module.css";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/lib/utils";
import { useDialogAnimation } from "@/hooks/use-dialog-animation";


// =========================
// BaseDateField
// =========================

interface BaseDateFieldProps {
    label?: string;
    disabled?: boolean;
    className?: string;
    displayValue: string;
    children: React.ReactNode;
}

function BaseDateField({
    label,
    disabled,
    className,
    displayValue,
    children,
  }: BaseDateFieldProps) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [alignRight, setAlignRight] = useState(false);
  
    const { shouldRender, mounted } = useDialogAnimation(open, 200);
  
    useEffect(() => {
      if (!open) return;
  
      const handleClickOutside = (e: MouseEvent) => {
        if (!wrapperRef.current?.contains(e.target as Node)) {
          setOpen(false);
        }
      };
  
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpen(false);
        }
      };
  
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
  
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEsc);
      };
    }, [open]);

    useEffect(() => {
      if (!open || !shouldRender) return;

      const updatePopupAlignment = () => {
        const wrapper = wrapperRef.current;
        const popup = popupRef.current;
        if (!wrapper || !popup) return;

        const wrapperRect = wrapper.getBoundingClientRect();
        const popupWidth = popup.offsetWidth;
        const viewportWidth = window.innerWidth;
        const wouldOverflowRight = wrapperRect.left + popupWidth > viewportWidth - 8;
        const canAlignRight = wrapperRect.right - popupWidth >= 8;

        setAlignRight(wouldOverflowRight && canAlignRight);
      };

      const raf = window.requestAnimationFrame(updatePopupAlignment);
      window.addEventListener("resize", updatePopupAlignment);

      return () => {
        window.cancelAnimationFrame(raf);
        window.removeEventListener("resize", updatePopupAlignment);
      };
    }, [open, shouldRender]);
  
    return (
      <Field className="h-full">
        {label && <FieldLabel>{label}</FieldLabel>}
  
        <div ref={wrapperRef} className="relative h-full">
          <Button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((prev) => !prev)}
            className={cn(styles.Select, className)}
            noStyle
          >
            {displayValue}
            <SelectChevronUpDownIcon />
          </Button>
  
          {shouldRender && (
            <div
              ref={popupRef}
              className={cn(
                styles.Popup,
                "absolute z-50 mt-2 p-3 bg-white rounded-md shadow-md max-w-[calc(100vw-1rem)] overflow-auto",
                alignRight ? "right-0" : "left-0",
                "transition-all duration-200 ease-out",
                mounted
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              )}
            >
              {children}
            </div>
          )}
        </div>
      </Field>
    );
  }
  


// =========================
// Single
// =========================

interface DateFieldSingleProps {
    label?: string;
    value?: Date | null;
    onValueChange: (date: Date | null) => void;
    disabled?: boolean;
    className?: string;
    formatStr?: string;
}

function DateFieldSingle({
    label,
    value,
    onValueChange,
    disabled,
    className,
    formatStr = "dd/MM/yyyy",
}: DateFieldSingleProps) {
    return (
        <BaseDateField
            label={label}
            disabled={disabled}
            className={className}
            displayValue={value ? format(value, formatStr) : "Pilih tanggal"}
        >
            <DayPicker
                className={cn(styles.Picker, "")}
                mode="single"
                selected={value ?? undefined}
                onSelect={(date) => {
                    onValueChange(date ?? null);
                }}
            />
        </BaseDateField>
    );
}


// =========================
// Multiple
// =========================

interface DateFieldMultipleProps {
    label?: string;
    value?: Date[];
    onValueChange: (dates: Date[]) => void;
    disabled?: boolean;
    className?: string;
    formatStr?: string;
}

function DateFieldMultiple({
    label,
    value = [],
    onValueChange,
    disabled,
    className,
    formatStr = "dd/MM/yyyy",
}: DateFieldMultipleProps) {

    console.log(value)
    return (
        <BaseDateField
            label={label}
            disabled={disabled}
            className={className}
            displayValue={
                value.length
                    ? value.map((d) => format(d, formatStr)).join(", ")
                    : "Pilih tanggal"
            }
        >
            <DayPicker
                className={cn(styles.Picker, "")}
                mode="multiple"
                selected={value}
                onSelect={(dates) => onValueChange(dates ?? [])}
            />
        </BaseDateField>
    );
}

// =========================
// Range
// =========================

interface DateFieldRangeProps {
    label?: string;
    value?: {
        start?: string;
        end?: string;
    };
    onValueChange: (range: { start: string | undefined; end: string | undefined }) => void;
    disabled?: boolean;
    className?: string;
    formatStr?: string;
}

function DateFieldRange({
    label,
    value,
    onValueChange,
    disabled,
    className,
    formatStr = "dd/MM/yyyy",
}: DateFieldRangeProps) {
    const selected = {
        from: value?.start ? new Date(value.start) : undefined,
        to: value?.end ? new Date(value.end) : undefined,
    };

    const displayValue =
        selected.from && selected.to
            ? `${format(selected.from, formatStr)} - ${format(
                selected.to,
                formatStr
            )}`
            : "Pilih tanggal";

    return (
        <BaseDateField
            label={label}
            disabled={disabled}
            className={className}
            displayValue={displayValue}
        >
            <DayPicker
                className={cn(styles.Picker, "")}
                mode="range"
                selected={selected}
                onSelect={(range) => {
                    onValueChange({
                        start: range?.from
                            ? format(range.from, "yyyy-MM-dd")
                            : undefined,
                        end: range?.to
                            ? format(range.to, "yyyy-MM-dd")
                            : undefined,
                    });
                }}
            />
        </BaseDateField>
    );
}


export { DateFieldSingle, DateFieldMultiple, DateFieldRange };

