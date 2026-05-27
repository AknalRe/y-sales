import * as React from "react";
import * as BaseRadio from "@base-ui/react/radio";
import * as BaseRadioGroup from "@base-ui/react/radio-group";
import { cn } from "@/utils/lib/utils";
import styles from "./index.module.css";

// ====================
// Props
// ====================
type RadioGroupProps = React.ComponentProps<typeof BaseRadioGroup.RadioGroup>;
type RadioGroupLabelProps = React.HTMLAttributes<HTMLDivElement>;
type RadioItemProps = React.LabelHTMLAttributes<HTMLLabelElement>;
type RadioRootProps = React.ComponentProps<typeof BaseRadio.Radio.Root>;
type RadioIndicatorProps = React.ComponentProps<typeof BaseRadio.Radio.Indicator>;

// ====================
// Radio Group
// ====================
function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <BaseRadioGroup.RadioGroup
      {...props}
      className={cn(styles.RadioGroup, className)}
    />
  );
}

// ====================
// Group Label / Caption
// ====================
function RadioGroupLabel({ className, ...props }: RadioGroupLabelProps) {
  return (
    <div
      {...props}
      className={cn(styles.Caption, className)}
    />
  );
}

// ====================
// Item 
// ====================
function RadioItem({ className, ...props }: RadioItemProps) {
  return (
    <label
      {...props}
      className={cn(styles.Item, className)}
    />
  );
}

// ====================
// Radio Root
// ====================
function RadioRoot({ className, ...props }: RadioRootProps) {
  return (
    <BaseRadio.Radio.Root
      {...props}
      className={cn(styles.Radio, className)}
    />
  );
}

// ====================
// Indicator
// ====================
function RadioIndicator({ className, ...props }: RadioIndicatorProps) {
  return (
    <BaseRadio.Radio.Indicator
      {...props}
      className={cn(styles.Indicator, className)}
    />
  );
}

// ====================
// Example
// ====================
function ExampleRadioGroup() {
  const id = React.useId();

  return (
    <RadioGroup aria-labelledby={id} defaultValue="fuji-apple">
      <RadioGroupLabel id={id}>
        Best apple
      </RadioGroupLabel>

      <RadioItem>
        <RadioRoot value="fuji-apple">
          <RadioIndicator />
        </RadioRoot>
        Fuji
      </RadioItem>

      <RadioItem>
        <RadioRoot value="gala-apple">
          <RadioIndicator />
        </RadioRoot>
        Gala
      </RadioItem>

      <RadioItem>
        <RadioRoot value="granny-smith-apple">
          <RadioIndicator />
        </RadioRoot>
        Granny Smith
      </RadioItem>
    </RadioGroup>
  );
}

// ====================
// Custom components / logic
// ====================

interface RadioOption {
  label: React.ReactNode;
  value: string;
}

interface RadioProps {
  label?: React.ReactNode;
  data: RadioOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  className?: string;
}

function Radio({
  label,
  data,
  value,
  onValueChange,
  name,
  className,
}: RadioProps) {
  const id = React.useId();

  return (
    <RadioGroup
      aria-labelledby={id}
      value={value}
      onValueChange={(nextValue) => {
        onValueChange?.(String(nextValue));
      }}
      name={name}
      className={className}
    >
      {label && (
        <RadioGroupLabel id={id}>
          {label}
        </RadioGroupLabel>
      )}

      {data.map(({ label: optionLabel, value: optionValue }) => (
        <RadioItem key={optionValue}>
          <RadioRoot value={optionValue}>
            <RadioIndicator />
          </RadioRoot>
          {optionLabel}
        </RadioItem>
      ))}
    </RadioGroup>
  );
}

// ====================
// Export
// ====================
export {
  RadioGroup,
  RadioGroupLabel,
  RadioItem,
  RadioRoot,
  RadioIndicator,
  ExampleRadioGroup,
  Radio,
};
