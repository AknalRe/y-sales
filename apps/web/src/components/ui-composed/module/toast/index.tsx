import { useState } from 'react'
import * as BaseToast from "@base-ui/react/toast";
import styles from "./index.module.css";
import { cn } from '@/utils/lib/utils';

interface ToastButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
}

type ToastRootProps = React.ComponentPropsWithoutRef<typeof BaseToast.Toast.Root>;
type ToastTitleProps = React.ComponentPropsWithoutRef<typeof BaseToast.Toast.Title>;
type ToastDescriptionProps = React.ComponentPropsWithoutRef<typeof BaseToast.Toast.Description>;
type ToastViewportProps = React.ComponentPropsWithoutRef<typeof BaseToast.Toast.Viewport>;
type ToastProviderProps = React.ComponentPropsWithoutRef<typeof BaseToast.Toast.Provider>;
type ToastPortalProps = React.ComponentPropsWithoutRef<typeof BaseToast.Toast.Portal>;

function ToastProvider({ children, ...rest }: ToastProviderProps) {
    return <BaseToast.Toast.Provider {...rest}>{children}</BaseToast.Toast.Provider>;
}

function Toast({ children, className, ...rest }: ToastRootProps) {
    return (
        <BaseToast.Toast.Root className={cn(styles.Toast, className)} {...rest}>
            {children}
        </BaseToast.Toast.Root>
    );
}

function ToastTitle({ children, className, ...rest }: ToastTitleProps) {
    return (
        <BaseToast.Toast.Title className={cn(styles.Title, className)} {...rest}>
            {children}
        </BaseToast.Toast.Title>
    );
}

function ToastDescription({ children, className, ...rest }: ToastDescriptionProps) {
    return (
        <BaseToast.Toast.Description className={cn(styles.Description, className)} {...rest}>
            {children}
        </BaseToast.Toast.Description>
    );
}

function ToastAction({ children, className, ...rest }: ToastButtonProps) {
    return (
        <BaseToast.Toast.Action className={cn(styles.Button, className)} {...rest}>
            {children}
        </BaseToast.Toast.Action>
    );
}

function ToastClose({ children, className, ...rest }: ToastButtonProps) {
    return (
        <BaseToast.Toast.Close className={cn(styles.Button, className)} {...rest}>
            {children}
        </BaseToast.Toast.Close>
    );
}

function ToastPortal({ children, ...rest }: ToastPortalProps) {
    return <BaseToast.Toast.Portal {...rest}>{children}</BaseToast.Toast.Portal>;
}

function ToastViewport({ children, className, ...rest }: ToastViewportProps) {
    return (
        <BaseToast.Toast.Viewport className={cn(styles.Viewport, className)} {...rest}>
            {children}
        </BaseToast.Toast.Viewport>
    );
}

function ToastButton() {
    const toastManager = BaseToast.Toast.useToastManager();
    const [count, setCount] = useState(0);

    function createToast() {
        const nextCount = count + 1;
        setCount(nextCount);
        toastManager.add({
            title: `Toast ${nextCount} created`,
            description: 'This is a toast notification.',
        });
    }

    return (
        <button type="button" className={styles.Button} onClick={createToast}>
            Create toast
        </button>
    );
}

function ToastList() {
    const { toasts } = BaseToast.Toast.useToastManager();

    const typeClass: Record<string, string | undefined> = {
        success: styles.ToastSuccess,
        error: styles.ToastError,
        info: styles.ToastInfo,
        warning: styles.ToastWarning,
    };

    return toasts.map((toast) => {
        const duration =
            typeof toast?.timeout === "number"
                ? toast.timeout
                : typeof toast?.data?.duration === "number"
                    ? toast.data.duration
                    : 5000;
        const showProgressBar = toast?.data?.showProgressBar !== false && duration > 0;

        return (
            <Toast
                key={toast.id}
                toast={toast}
                data-type={toast?.data?.type ?? undefined}
                className={cn(
                    typeClass[String(toast?.data?.type)],
                    toast?.data?.loading ? styles.ToastLoading : undefined
                )}
            >
                <div className={styles.Content}>
                    <div className={styles.TitleRow}>
                        {toast?.data?.loading ? <LoadingSpinner className={styles.LoadingIcon} /> : null}
                        <ToastTitle>{toast.title}</ToastTitle>
                    </div>
                    <ToastDescription>{toast.description}</ToastDescription>
                    <ToastClose className={styles.Close} aria-label="Close">
                        <XIcon className={styles.Icon} />
                    </ToastClose>
                </div>
                {showProgressBar ? (
                    <div className={styles.Progress} aria-hidden="true">
                        <div
                            className={styles.ProgressBar}
                            style={{ animationDuration: `${duration}ms` }}
                        />
                    </div>
                ) : null}
            </Toast>
        );
    });
}

function XIcon(props: React.ComponentProps<'svg'>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function LoadingSpinner(props: React.ComponentProps<'svg'>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}

export {
    ToastProvider,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastAction,
    ToastClose,
    ToastViewport,
    ToastButton,
    ToastList,
    ToastPortal,
    BaseToast
};
