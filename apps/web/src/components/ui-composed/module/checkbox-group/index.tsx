import * as React from "react";
import * as BaseCheckbox from "@base-ui/react/checkbox";
import * as BaseCheckboxGroup from "@base-ui/react/checkbox-group";
import { cn } from "@/utils/lib/utils";
import styles from "./index.module.css";

// ====================
// Types
// ====================
type CheckboxGroupProps = React.ComponentProps<typeof BaseCheckboxGroup.CheckboxGroup>;
type CheckboxGroupLabelProps = React.HTMLAttributes<HTMLDivElement>;
type CheckboxItemProps = React.LabelHTMLAttributes<HTMLLabelElement>;
type CheckboxRootProps = React.ComponentProps<typeof BaseCheckbox.Checkbox.Root>;
type CheckboxIndicatorProps = React.ComponentProps<typeof BaseCheckbox.Checkbox.Indicator>;

// ====================
// Checkbox Group
// ====================
function CheckboxGroup({ className, ...props }: CheckboxGroupProps) {
  return (
    <BaseCheckboxGroup.CheckboxGroup
      {...props}
      className={cn(styles.CheckboxGroup, className)}
    />
  );
}

// ====================
// Group Label / Caption
// ====================
function CheckboxGroupLabel({ className, ...props }: CheckboxGroupLabelProps) {
  return (
    <div
      {...props}
      className={cn(styles.Caption, className)}
    />
  );
}

// ====================
// Item (label wrapper)
// ====================
function CheckboxItem({ className, ...props }: CheckboxItemProps) {
  return (
    <label
      {...props}
      className={cn(styles.Item, className)}
    />
  );
}

// ====================
// Checkbox Root
// ====================
function CheckboxRoot({ className, ...props }: CheckboxRootProps) {
  return (
    <BaseCheckbox.Checkbox.Root
      {...props}
      className={cn(styles.Checkbox, className)}
    />
  );
}

// ====================
// Indicator
// ====================
function CheckboxIndicator({ className, ...props }: CheckboxIndicatorProps) {
  return (
    <BaseCheckbox.Checkbox.Indicator
      {...props}
      className={cn(styles.Indicator, className)}
    />
  );
}

// ====================
// Example (ACUAN / SAFE)
// ====================
function ExampleCheckboxGroup() {
  const id = React.useId();

  return (
    <CheckboxGroup
      aria-labelledby={id}
      defaultValue={["fuji-apple"]}
    >
      <CheckboxGroupLabel id={id}>
        Apples
      </CheckboxGroupLabel>

      <CheckboxItem>
        <CheckboxRoot name="apple" value="fuji-apple">
          <CheckboxIndicator>
            <CheckIcon />
          </CheckboxIndicator>
        </CheckboxRoot>
        Fuji
      </CheckboxItem>

      <CheckboxItem>
        <CheckboxRoot name="apple" value="gala-apple">
          <CheckboxIndicator>
            <CheckIcon />
          </CheckboxIndicator>
        </CheckboxRoot>
        Gala
      </CheckboxItem>

      <CheckboxItem>
        <CheckboxRoot name="apple" value="granny-smith-apple">
          <CheckboxIndicator>
            <CheckIcon />
          </CheckboxIndicator>
        </CheckboxRoot>
        Granny Smith
      </CheckboxItem>
    </CheckboxGroup>
  );
}

// ====================
// Icon
// ====================
function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      fill="currentColor"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className={styles.Icon}
      {...props}
    >
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  );
}

// ====================
// Export
// ====================
export {
  CheckboxGroup,
  CheckboxGroupLabel,
  CheckboxItem,
  CheckboxRoot,
  CheckboxIndicator,
  ExampleCheckboxGroup,
};
