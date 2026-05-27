import * as React from "react";
import * as BaseAlertDialog from "@base-ui/react/alert-dialog";
import { cn } from '@/utils/lib/utils';
import type { VariantProps } from "class-variance-authority";
import { button, backdrop, popup, title, description, actions } from "./style";

// ====================
// Props
// ====================

type AlertDialogProps = React.ComponentProps<typeof BaseAlertDialog.AlertDialog.Root>;
type AlertDialogTriggerProps = React.ComponentProps<typeof BaseAlertDialog.AlertDialog.Trigger> & VariantProps<typeof button>;
type AlertDialogPortalProps = React.ComponentProps<typeof BaseAlertDialog.AlertDialog.Portal>;
type AlertDialogBackdropProps = React.ComponentProps<typeof BaseAlertDialog.AlertDialog.Backdrop>;
type AlertDialogPopupProps = React.ComponentProps<typeof BaseAlertDialog.AlertDialog.Popup>;
type AlertDialogTitleProps = React.ComponentProps<typeof BaseAlertDialog.AlertDialog.Title>;
type AlertDialogDescriptionProps = React.ComponentProps<typeof BaseAlertDialog.AlertDialog.Description>;
type AlertDialogCloseProps = React.ComponentProps<typeof BaseAlertDialog.AlertDialog.Close> & VariantProps<typeof button>;
type AlertDialogActionsProps = React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode };

// ====================
// Components
// ====================

// Root
function AlertDialog(props: AlertDialogProps) {
  return <BaseAlertDialog.AlertDialog.Root {...props} />;
}

// Trigger
function AlertDialogTrigger({ className, ...props }: AlertDialogTriggerProps) {
  return (
    <BaseAlertDialog.AlertDialog.Trigger
      {...props}
      className={cn(button(), className)}
    />
  );
}

// Portal
function AlertDialogPortal(props: AlertDialogPortalProps) {
  return <BaseAlertDialog.AlertDialog.Portal {...props} />;
}

// Backdrop
function AlertDialogBackdrop({ className, ...props }: AlertDialogBackdropProps) {
  return (
    <BaseAlertDialog.AlertDialog.Backdrop
      {...props}
      className={cn(backdrop(), className)}
    />
  );
}

// Popup
function AlertDialogPopup({ className, ...props }: AlertDialogPopupProps) {
  return (
    <BaseAlertDialog.AlertDialog.Popup
      {...props}
      className={cn(popup(), className)}
    />
  );
}

// Title
function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return (
    <BaseAlertDialog.AlertDialog.Title
      {...props}
      className={cn(title(), className)}
    />
  );
}

// Description
function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return (
    <BaseAlertDialog.AlertDialog.Description
      {...props}
      className={cn(description(), className)}
    />
  );
}

// Actions
function AlertDialogActions({ className, children, ...props }: AlertDialogActionsProps) {
  return (
    <div className={cn(actions(), className)} {...props}>
      {children}
    </div>
  );
}

// Close
function AlertDialogClose({ className, ...props }: AlertDialogCloseProps) {
  return (
    <BaseAlertDialog.AlertDialog.Close
      {...props}
      className={cn(button(), className)}
    />
  );
}

// ====================
// Export all components
// ====================

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogBackdrop,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogActions,
  AlertDialogClose,
};