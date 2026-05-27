import * as BaseCombobox from "@base-ui/react/combobox";
import styles from "./index.module.css";
import { cn } from '@/utils/lib/utils';

// ====================
// Types & Interfaces
// ====================
type ComboboxProps = React.ComponentProps<typeof BaseCombobox.Combobox.Root>;
type ComboboxInputProps = React.ComponentProps<typeof BaseCombobox.Combobox.Input>;
type ComboboxClearProps = React.ComponentProps<typeof BaseCombobox.Combobox.Clear>;
type ComboboxTriggerProps = React.ComponentProps<typeof BaseCombobox.Combobox.Trigger>;
type ComboboxPortalProps = React.ComponentProps<typeof BaseCombobox.Combobox.Portal>;
type ComboboxPositionerProps = React.ComponentProps<typeof BaseCombobox.Combobox.Positioner>;
type ComboboxPopupProps = React.ComponentProps<typeof BaseCombobox.Combobox.Popup>;
type ComboboxEmptyProps = React.ComponentProps<typeof BaseCombobox.Combobox.Empty>;
type ComboboxListProps = React.ComponentProps<typeof BaseCombobox.Combobox.List>;
type ComboboxItemProps = React.ComponentProps<typeof BaseCombobox.Combobox.Item>;
type ComboboxItemIndicatorProps = React.ComponentProps<typeof BaseCombobox.Combobox.ItemIndicator>;



// ====================
// Wrapper / function components
// ====================
function Combobox({ children, ...rest }: ComboboxProps) {
  return <BaseCombobox.Combobox.Root {...rest}>{children}</BaseCombobox.Combobox.Root>;
}

function ComboboxInput({ className, ...rest }: ComboboxInputProps) {
  return (
    <BaseCombobox.Combobox.Input
      className={cn(styles.Input, className)}
      {...rest}
    />
  );
}

function ComboboxTrigger({ children, className, ...rest }: ComboboxTriggerProps) {
  return (
    <BaseCombobox.Combobox.Trigger
      className={cn(styles.Button, className)}
      {...rest}
    >
      {children}
    </BaseCombobox.Combobox.Trigger>
  );
}

function ComboboxClear({ children, className, ...rest }: ComboboxClearProps) {
  return (
    <BaseCombobox.Combobox.Clear
      className={cn(styles.Button, className)}
      {...rest}
    >
      {children}
    </BaseCombobox.Combobox.Clear>
  );
}



function ComboboxPortal({ children, ...rest }: ComboboxPortalProps) {
  return (
    <BaseCombobox.Combobox.Portal {...rest}>
      {children}
    </BaseCombobox.Combobox.Portal>
  );
}

function ComboboxPositioner({ children, className, sideOffset = 0, ...rest }: ComboboxPositionerProps) {
  return (
    <BaseCombobox.Combobox.Positioner sideOffset={sideOffset} className={className} {...rest}>
      {children}
    </BaseCombobox.Combobox.Positioner>
  );
}

function ComboboxPopup({ children, className, ...rest }: ComboboxPopupProps) {
  return (
    <BaseCombobox.Combobox.Popup className={cn(styles.Popup, className)} {...rest}>
      {children}
    </BaseCombobox.Combobox.Popup>
  );
}

function ComboboxList({ children, className, ...rest }: ComboboxListProps) {
  return (
    <BaseCombobox.Combobox.List className={cn(styles.List, className)} {...rest}>
      {children}
    </BaseCombobox.Combobox.List>
  );
}

function ComboboxEmpty({ children, className, ...rest }: ComboboxEmptyProps) {
  return (
    <BaseCombobox.Combobox.Empty className={cn(styles.Empty, className)} {...rest}>
      {children}
    </BaseCombobox.Combobox.Empty>
  );
}

function ComboboxItem({ children, className, ...rest }: ComboboxItemProps) {
  return (
    <BaseCombobox.Combobox.Item className={cn(styles.Item, className)} {...rest}>
      {children}
    </BaseCombobox.Combobox.Item>
  );
}

function ComboboxItemIndicator({ children, className, ...rest }: ComboboxItemIndicatorProps) {
  return (
    <BaseCombobox.Combobox.ItemIndicator className={cn(styles.ItemIndicator, className)} {...rest}>
      {children}
    </BaseCombobox.Combobox.ItemIndicator>
  );
}


// ====================
// Custom components / logic
// ====================
function ComboboxCheckIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      fill="currentcolor"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      {...props}
    >
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  );
}

function ComboboxClearIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      className={styles.ClearIcon + (props.className ? ` ${props.className}` : "")}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function ComboboxChevronDownIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      className={styles.TriggerIcon + (props.className ? ` ${props.className}` : "")}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ComboboxActionButtons(props: {
  id?: string;
  placeholder?: string;
  value?: string;
  type?: string;
  onValueChange?: (value: string) => void;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onInputFocus?: React.FocusEventHandler<HTMLInputElement>;
  onInputBlur?: React.FocusEventHandler<HTMLInputElement>;
  onInputKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  wrapperClassName?: string;
  inputClassName?: string;
  actionClassName?: string;
  clearClassName?: string;
  triggerClassName?: string;
  disabled?: boolean;
}) {

  return (
    <div className={cn(styles.InputWrapper, props.wrapperClassName)}>
      <ComboboxInput
        placeholder={props.placeholder ?? "e.g. Apple"}
        id={props.id}
        type={props.type}
        className={cn(styles.Input, props.inputClassName)}
        {...(props.value !== undefined ? { value: props.value } : {})}
        onChange={(e) => props.onValueChange?.(e.target.value)}
        onFocus={props.onInputFocus}
        onBlur={props.onInputBlur}
        onKeyDown={props.onInputKeyDown}
        disabled={props.disabled}
      />
      <div className={cn(styles.ActionButtons, props.actionClassName)}>
        <ComboboxClear className={cn(styles.Clear, props.clearClassName)} aria-label="Clear selection" disabled={props.disabled}>
          <ComboboxClearIcon className={styles.ClearIcon} />
        </ComboboxClear>
        <ComboboxTrigger className={cn(styles.Trigger, props.triggerClassName)} aria-label="Open popup" disabled={props.disabled}>
          <ComboboxChevronDownIcon className={styles.TriggerIcon} />
        </ComboboxTrigger>
      </div>
    </div>
  );
}

// ====================
// Export all components
// ====================

export {
  Combobox,
  ComboboxInput,
  ComboboxClear,
  ComboboxTrigger,
  ComboboxPortal,
  ComboboxPositioner,
  ComboboxPopup,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxCheckIcon,
  ComboboxClearIcon,
  ComboboxChevronDownIcon,
  ComboboxActionButtons,
};
