import * as React from 'react';
import * as BaseField from '@base-ui/react/field';
import * as BaseForm from '@base-ui/react/form';
import { Button as UIButton } from '@/components/ui/button';
import { cn } from '@/utils/lib/utils';
import type { VariantProps } from "class-variance-authority";
import { form, field, label, input, errorText, button, action } from './style';


// ====================
// Props
// ====================
type FormProps = React.ComponentProps<typeof BaseForm.Form>;
type FieldProps = React.ComponentProps<typeof BaseField.Field.Root>;
type FieldLabelProps = React.ComponentProps<typeof BaseField.Field.Label>;
type FieldErrorProps = React.ComponentProps<typeof BaseField.Field.Error>;
type FieldControlProps = React.ComponentPropsWithoutRef<typeof BaseField.Field.Control>;
type FormActionProps = React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode };
// ====================
// CVA Props
// ====================
type ButtonProps = React.ComponentProps<typeof UIButton> & VariantProps<typeof button>;



// ====================
// Form
// ====================

function Form(props: FormProps) {
  return (
    <BaseForm.Form
      {...props}
      className={cn(form(), props.className)}
    />
  );
}

// ====================
// Field Root
// ====================

function FormField(props: FieldProps) {
  return (
    <BaseField.Field.Root
      {...props}
      className={cn(field(), props.className)}
    />
  );
}

// ====================
// Field Label
// ====================

function FormFieldLabel(props: FieldLabelProps) {
  return (
    <BaseField.Field.Label
      {...props}
      className={cn(label(), props.className)}
    />
  );
}

// ====================
// Field Control 
// ====================

function FormFieldControl(props: FieldControlProps) {
  return (
    <BaseField.Field.Control
      {...props}
      className={cn(input(), props.className)}
    />
  );
}

// ====================
// Field Error
// ====================

function FormFieldError(props: FieldErrorProps) {
  return (
    <BaseField.Field.Error
      {...props}
      className={cn(errorText(), props.className)}
    />
  );
}

// ====================
// Form Action
// ====================

export function FormAction({ className, children, ...props }: FormActionProps) {
  return (
    <div
      className={cn(action(), className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ====================
// Button
// ====================

function FormButton({ variant, size, className, ...props }: ButtonProps) {
  return <UIButton {...props} className={cn(button({ variant, size }), className)} />
}

export {
  Form,
  FormField,
  FormFieldLabel,
  FormFieldControl,
  FormFieldError,
  FormButton,
};
