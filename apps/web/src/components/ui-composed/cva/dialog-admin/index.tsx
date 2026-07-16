import * as React from "react";
import * as BaseDialog from "@base-ui/react/dialog";
import { cn } from "@/utils/lib/utils";
import type { VariantProps } from "class-variance-authority";
import {
  backdrop,
  popup,
  header,
  title,
  subtitle,
  close,
  body,
  footer,
  maxHeight,
} from "./style";

// ====================
// Props
// ====================
type DialogProps = React.ComponentProps<typeof BaseDialog.Dialog.Root>;
type DialogPortalProps = React.ComponentProps<typeof BaseDialog.Dialog.Portal>;
type DialogBackdropProps = React.ComponentProps<typeof BaseDialog.Dialog.Backdrop>;
type DialogContentProps = React.ComponentProps<typeof BaseDialog.Dialog.Popup> &
  VariantProps<typeof popup>;
type DialogHeaderProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof header>;
type DialogTitleProps = React.ComponentProps<typeof BaseDialog.Dialog.Title>;
type DialogSubtitleProps = React.HTMLAttributes<HTMLParagraphElement>;
type DialogCloseProps = React.ComponentProps<typeof BaseDialog.Dialog.Close>;
type DialogBodyProps = React.HTMLAttributes<HTMLElement> & VariantProps<typeof body>;
type DialogFooterProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof footer>;
type DialogActionsProps = React.HTMLAttributes<HTMLDivElement>;

// ====================
// Dialog Root
// ====================
function AdminDialog(props: DialogProps) {
  return <BaseDialog.Dialog.Root {...props} />;
}

// ====================
// Portal
// ====================
function AdminDialogPortal(props: DialogPortalProps) {
  return <BaseDialog.Dialog.Portal {...props} />;
}

// ====================
// Backdrop
// ====================
function AdminDialogBackdrop({ className, ...props }: DialogBackdropProps) {
  return (
    <BaseDialog.Dialog.Backdrop
      {...props}
      className={cn(backdrop(), className)}
    />
  );
}

// ====================
// Content (Popup)
// ====================
function AdminDialogContent({ className, size, ...props }: DialogContentProps) {
  return (
    <BaseDialog.Dialog.Popup
      {...props}
      className={cn(popup({ size }), maxHeight({ size }), className)}
    />
  );
}

// ====================
// Header
// ====================
function AdminDialogHeader({ className, divider, ...props }: DialogHeaderProps) {
  return (
    <div
      {...props}
      className={cn(header({ divider }), className)}
    />
  );
}

// ====================
// Title
// ====================
function AdminDialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <BaseDialog.Dialog.Title
      {...props}
      className={cn(title(), className)}
    />
  );
}

// ====================
// Subtitle
// ====================
function AdminDialogSubtitle({ className, ...props }: DialogSubtitleProps) {
  return (
    <p
      {...props}
      className={cn(subtitle(), className)}
    />
  );
}

// ====================
// Close (X button)
// ====================
function AdminDialogClose({ className, ...props }: DialogCloseProps) {
  return (
    <BaseDialog.Dialog.Close
      {...props}
      className={cn(close(), className)}
    />
  );
}

// ====================
// Body
// ====================
function AdminDialogBody({ className, scroll, ...props }: DialogBodyProps) {
  return (
    <div
      {...props}
      className={cn(body({ scroll }), className)}
    />
  );
}

// ====================
// Footer
// ====================
function AdminDialogFooter({ className, divider, ...props }: DialogFooterProps) {
  return (
    <div
      {...props}
      className={cn(footer({ divider }), className)}
    />
  );
}

// ====================
// Actions (alias for footer-less action rows)
// ====================
function AdminDialogActions({ className, ...props }: DialogActionsProps) {
  return (
    <div
      {...props}
      className={cn("flex items-center justify-end gap-2", className)}
    />
  );
}

// ====================
// Export all components
// ====================
export {
  AdminDialog,
  AdminDialogPortal,
  AdminDialogBackdrop,
  AdminDialogContent,
  AdminDialogHeader,
  AdminDialogTitle,
  AdminDialogSubtitle,
  AdminDialogClose,
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogActions,
};
