import * as React from "react";
import * as BaseSwitch from "@base-ui/react/switch";
import { cn } from "@/utils/lib/utils";
import styles from "./index.module.css";

// ====================
// Props
// ====================
type SwitchProps = React.LabelHTMLAttributes<HTMLLabelElement>;
type SwitchRootProps = React.ComponentProps<typeof BaseSwitch.Switch.Root>;
type SwitchThumbProps = React.ComponentProps<typeof BaseSwitch.Switch.Thumb>;
type SwitchLabelProps = React.HTMLAttributes<HTMLSpanElement>;

// ====================
// Wrapper
// ====================
function Switch({ className, ...props }: SwitchProps) {
  return (
    <label
      {...props}
      className={cn(styles.Label, className)}
    />
  );
}

// ====================
// Switch Root
// ====================
function SwitchInput({ className, ...props }: SwitchRootProps) {
  return (
    <BaseSwitch.Switch.Root
      {...props}
      className={cn(styles.Switch, className)}
    />
  );
}

// ====================
// Thumb 
// ====================
function SwitchThumb({ className, ...props }: SwitchThumbProps) {
  return (
    <BaseSwitch.Switch.Thumb
      {...props}
      className={cn(styles.Thumb, className)}
    />
  );
}

// ====================
// Label Text
// ====================
function SwitchLabel({ className, ...props }: SwitchLabelProps) {
  return (
    <span
      {...props}
      className={className}
    />
  );
}

// ====================
// Example using the Wrapper
// ====================
interface ExampleSwitchProps {
  children?: React.ReactNode;
  className?: string;
  checked?: boolean;
  onCheckedChange?: (value: boolean) => void;
}

function ExampleSwitch(props: ExampleSwitchProps) {
  return (
    <Switch className={cn("flex justify-between gap-2", props.className)}>
      <SwitchLabel>{props.children}</SwitchLabel>
      <SwitchInput
        checked={props.checked}
        onCheckedChange={props.onCheckedChange}>
        <SwitchThumb />
      </SwitchInput >
    </Switch>
  );
}



// ====================
// Export
// ====================
export {
  Switch,
  SwitchInput,
  SwitchThumb,
  SwitchLabel,
  ExampleSwitch
};
