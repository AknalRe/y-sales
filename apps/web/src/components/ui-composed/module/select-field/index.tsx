import * as React from "react";
import * as BaseSelect from "@base-ui/react/select";
import * as BaseField from "@base-ui/react/field";
import { cn } from '@/utils/lib/utils';
import styles from "./index.module.css";

// ====================
// Types & Interfaces
// ====================

type FieldProps = React.ComponentProps<typeof BaseField.Field.Root>;
type FieldLabelProps = React.ComponentProps<typeof BaseField.Field.Label>;
type FieldDescriptionProps = React.ComponentProps<typeof BaseField.Field.Description>;
type FieldErrorProps = React.ComponentProps<typeof BaseField.Field.Error>;

type SelectProps = React.ComponentProps<typeof BaseSelect.Select.Root>;
type SelectTriggerProps = React.ComponentProps<typeof BaseSelect.Select.Trigger>;
type SelectValueProps = React.ComponentProps<typeof BaseSelect.Select.Value>;
type SelectIconProps = React.ComponentProps<typeof BaseSelect.Select.Icon>;
type SelectPortalProps = React.ComponentProps<typeof BaseSelect.Select.Portal>;
type SelectPositionerProps = React.ComponentProps<typeof BaseSelect.Select.Positioner>;
type SelectPopupProps = React.ComponentProps<typeof BaseSelect.Select.Popup>;
type SelectListProps = React.ComponentProps<typeof BaseSelect.Select.List>;
type SelectItemProps = React.ComponentProps<typeof BaseSelect.Select.Item>;
type SelectItemTextProps = React.ComponentProps<typeof BaseSelect.Select.ItemText>;
type SelectItemIndicatorProps = React.ComponentProps<typeof BaseSelect.Select.ItemIndicator>;
type SelectArrowProps = React.ComponentProps<typeof BaseSelect.Select.ScrollUpArrow>;

// ====================
// FIELD COMPONENTS
// ====================

function Field(props: FieldProps) {
  return (
    <BaseField.Field.Root
      {...props}
      className={cn(styles.Field, props.className)}
    />
  );
}

function FieldLabel(props: FieldLabelProps) {
  return (
    <BaseField.Field.Label
      {...props}
      className={cn(styles.Label, props.className)}
    />
  );
}

function FieldDescription(props: FieldDescriptionProps) {
  return (
    <BaseField.Field.Description
      {...props}
    />
  );
}

function FieldError(props: FieldErrorProps) {
  return (
    <BaseField.Field.Error
      {...props}
    />
  );
}

// ====================
// SELECT COMPONENTS
// ====================

function Select(props: SelectProps) {
  return <BaseSelect.Select.Root {...props} />;
}

function SelectTrigger(props: SelectTriggerProps) {
  return (
    <BaseSelect.Select.Trigger
      {...props}
      className={cn(styles.Select, props.className)}
    />
  );
}

function SelectValue(props: SelectValueProps) {
  return (
    <BaseSelect.Select.Value
      {...props}
      className={cn(styles.Value, props.className)}
    />
  );
}

function SelectIcon(props: SelectIconProps) {
  return (
    <BaseSelect.Select.Icon
      {...props}
      className={cn(styles.SelectIcon, props.className)}
    />
  );
}

function SelectPortal(props: SelectPortalProps) {
  return <BaseSelect.Select.Portal {...props} />;
}

function SelectPositioner({ children, className, sideOffset = 4, alignItemWithTrigger = false, ...rest }: SelectPositionerProps & { sideOffset?: number }) {
  return (
    <BaseSelect.Select.Positioner
      sideOffset={sideOffset}
      alignItemWithTrigger={alignItemWithTrigger}
      className={cn(styles.Positioner, className)}
      {...rest}
    >
      {children}
    </BaseSelect.Select.Positioner>
  );
}

function SelectPopup(props: SelectPopupProps) {
  return (
    <BaseSelect.Select.Popup
      {...props}
      className={cn(styles.Popup, props.className)}
    />
  );
}

function SelectList(props: SelectListProps) {
  return (
    <BaseSelect.Select.List
      {...props}
      className={cn(styles.List, props.className)}
    />
  );
}

function SelectItem(props: SelectItemProps) {
  return (
    <BaseSelect.Select.Item
      {...props}
      className={cn(styles.Item, props.className)}
    />
  );
}

function SelectItemText(props: SelectItemTextProps) {
  return (
    <BaseSelect.Select.ItemText
      {...props}
      className={cn(styles.ItemText, props.className)}
    />
  );
}

function SelectItemIndicator(props: SelectItemIndicatorProps) {
  return (
    <BaseSelect.Select.ItemIndicator
      {...props}
      className={cn(styles.ItemIndicator, props.className)}
    />
  );
}

function SelectItemIndicatorIcon(props: React.ComponentProps<'span'>) {
  return (
    <span className={cn(styles.ItemIndicatorIcon, props.className)} {...props} />
  );
}

function SelectScrollUpArrow(props: SelectArrowProps) {
  return (
    <BaseSelect.Select.ScrollUpArrow
      {...props}
      className={cn(styles.ScrollArrow, props.className)}
    />
  );
}

function SelectScrollDownArrow(props: SelectArrowProps) {
  return (
    <BaseSelect.Select.ScrollDownArrow
      {...props}
      className={cn(styles.ScrollArrow, props.className)}
    />
  );
}

// ====================
// Custom components / logic
// ====================

interface SelectFieldOption {
  label: React.ReactNode;
  value: string;
}

interface SelectFieldProps {
  label?: React.ReactNode;
  data: SelectFieldOption[];
  value?: string | number | null;
  onValueChange?: (value: string) => void;
  className? :string;

}

function SelectField({
  label,
  data,
  value,
  onValueChange,
  className
}: SelectFieldProps) {

  return (
    <Field>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Select
        items={data}
        value={value}
        onValueChange={(nextValue) => {
          onValueChange?.(String(nextValue));
        }}
      >
        <SelectTrigger className={className}>
          <SelectValue />
          <SelectIcon>
            <SelectChevronUpDownIcon />
          </SelectIcon>
        </SelectTrigger>

        <SelectPortal>
          <SelectPositioner sideOffset={8}>
            <SelectPopup>
              <SelectScrollUpArrow />
              <SelectList>
                {data.map(({ label, value }) => {
                  return <SelectItem key={value} value={value} >
                    <SelectItemIndicator>
                      <SelectCheckIcon />
                    </SelectItemIndicator>
                    <SelectItemText >{label}</SelectItemText>
                  </SelectItem>
                })}
              </SelectList>
              <SelectScrollDownArrow />
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    </Field>
  );
}



function SelectChevronUpDownIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      width="8"
      height="12"
      viewBox="0 0 8 12"
      fill="none"
      stroke="currentcolor"
      strokeWidth="1.5"
      {...props}
    >
      <path d="M0.5 4.5L4 1.5L7.5 4.5" />
      <path d="M0.5 7.5L4 10.5L7.5 7.5" />
    </svg>
  );
}

function SelectCheckIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10" {...props}>
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  );
}

// ====================
// Export
// ====================

export {
  // Field
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,

  // Select
  Select,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectPositioner,
  SelectPopup,
  SelectList,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectItemIndicatorIcon,
  SelectScrollUpArrow,
  SelectScrollDownArrow,
  SelectChevronUpDownIcon,
  SelectCheckIcon,

  // Component
  SelectField
};
