import * as React from "react";
import * as BaseDialog from "@base-ui/react/dialog";
import { cn } from "@/utils/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { button, backdrop, popup, title, description, actions } from "./style";

// ====================
// Props
// ====================
type DialogProps = React.ComponentProps<typeof BaseDialog.Dialog.Root>;
type DialogPortalProps = React.ComponentProps<typeof BaseDialog.Dialog.Portal>;
type DialogTriggerProps = React.ComponentProps<typeof BaseDialog.Dialog.Trigger> & VariantProps<typeof button>;
type DialogBackdropProps = React.ComponentProps<typeof BaseDialog.Dialog.Backdrop>;
type DialogContentProps = React.ComponentProps<typeof BaseDialog.Dialog.Popup>;
type DialogTitleProps = React.ComponentProps<typeof BaseDialog.Dialog.Title>;
type DialogDescriptionProps = React.ComponentProps<typeof BaseDialog.Dialog.Description>;
type DialogCloseProps = React.ComponentProps<typeof BaseDialog.Dialog.Close> & VariantProps<typeof button>;
type DialogActionsProps = React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode };

// ====================
// Dialog Root
// ====================
function Dialog(props: DialogProps) {
  return <BaseDialog.Dialog.Root {...props} />;
}

// ====================
// Trigger Button
// ====================
function DialogTrigger({ className, ...props }: DialogTriggerProps) {
  return (
    <BaseDialog.Dialog.Trigger
      {...props}
      className={cn(button(), className)}
    />
  );
}

// ====================
// Portal
// ====================
function DialogPortal(props: DialogPortalProps) {
  return <BaseDialog.Dialog.Portal {...props} />;
}

// ====================
// Backdrop
// ====================
function DialogBackdrop({ className, ...props }: DialogBackdropProps) {
  return (
    <BaseDialog.Dialog.Backdrop
      {...props}
      className={cn(backdrop(), className)}
    />
  );
}

// ====================
// Content
// ====================
function DialogContent({ className, ...props }: DialogContentProps) {
  return (
    <BaseDialog.Dialog.Popup
      {...props}
      className={cn(popup(), className)}
    />
  );
}

// ====================
// Title
// ====================
function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <BaseDialog.Dialog.Title
      {...props}
      className={cn(title(), className)}
    />
  );
}

// ====================
// Description
// ====================
function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <BaseDialog.Dialog.Description
      {...props}
      className={cn(description(), className)}
    />
  );
}

// ====================
// Actions
// ====================
function DialogActions({ className, children, ...props }: DialogActionsProps) {
  return (
    <div className={cn(actions(), className)} {...props}>
      {children}
    </div>
  );
}

// ====================
// Close Button
// ====================
function DialogClose({ className, ...props }: DialogCloseProps) {
  return (
    <BaseDialog.Dialog.Close
      {...props}
      className={cn(button(), className)}
    />
  );
}

// ====================
// Export all components
// ====================
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogBackdrop,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogActions,
  DialogClose,
};
