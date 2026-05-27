import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/utils/lib/utils";
import styles from "./index.module.css";

// ======= ToggleGroup Panel =======
function ToggleGroupPanel({
  defaultValue = ["left"],
  className,
  children,
  ...props
}: ToggleGroupPrimitive.Props & { children?: React.ReactNode }) {
  return (
    <ToggleGroupPrimitive
      defaultValue={defaultValue}
      className={cn(styles.Panel, className)}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive>
  );
}

// ======= Toggle Button =======
function ToggleButton({
  className,
  ...props
}: TogglePrimitive.Props) {
  return (
    <TogglePrimitive className={cn(styles.Button, className)} {...props} />
  );
}

// ======= Example =======
function ExampleToggleGroup() {
  return (
    <ToggleGroupPanel>
      <ToggleButton aria-label="Align left" value="left">
        <AlignLeftIcon className={styles.Icon} />
      </ToggleButton>
      <ToggleButton aria-label="Align center" value="center">
        <AlignCenterIcon className={styles.Icon} />
      </ToggleButton>
      <ToggleButton aria-label="Align right" value="right">
        <AlignRightIcon className={styles.Icon} />
      </ToggleButton>
    </ToggleGroupPanel>
  );
}

// ======= Icon Components =======
function AlignLeftIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      stroke="currentcolor"
      strokeLinecap="round"
      {...props}
    >
      <path d="M2.5 3.5H13.5" />
      <path d="M2.5 9.5H13.5" />
      <path d="M2.5 6.5H10.5" />
      <path d="M2.5 12.5H10.5" />
    </svg>
  );
}

function AlignCenterIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      stroke="currentcolor"
      strokeLinecap="round"
      {...props}
    >
      <path d="M3 3.5H14" />
      <path d="M3 9.5H14" />
      <path d="M4.5 6.5H12.5" />
      <path d="M4.5 12.5H12.5" />
    </svg>
  );
}

function AlignRightIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      stroke="currentcolor"
      strokeLinecap="round"
      {...props}
    >
      <path d="M2.5 3.5H13.5" />
      <path d="M2.5 9.5H13.5" />
      <path d="M5.5 6.5H13.5" />
      <path d="M5.5 12.5H13.5" />
    </svg>
  );
}

// ======= Exports =======
export {
  ToggleGroupPanel,
  ToggleButton,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  ExampleToggleGroup,
};
