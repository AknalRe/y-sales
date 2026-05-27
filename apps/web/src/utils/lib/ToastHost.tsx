import { useEffect, useRef } from "react";
import {
  ToastList,
  ToastViewport,
  ToastPortal,
  ToastProvider,
  BaseToast
} from '@/components/ui-composed/module/toast';
import { bindToastManager, toast } from "@/utils/helpers/toast-bridge";


// -------------------------
// 1️⃣ Toast Provider + Portal
// -------------------------
export function ToastHost() {
  return <ToastProvider>
    <ToastBridge />
    <ToastPortal>
      <ToastViewport >
        <ToastList />
      </ToastViewport>
    </ToastPortal>
  </ToastProvider>
}

// -------------------------
// 2️⃣ Bridge untuk expose manager global
// -------------------------
export function ToastBridge() {
  const manager: any = BaseToast.Toast.useToastManager();

  useEffect(() => {
    bindToastManager(manager);
    return () => bindToastManager(null);
  }, [manager]);

  return null;
}

// -------------------------
// 3️⃣ Hook reusable untuk toast sekali panggil (StrictMode-safe)
// -------------------------
export function useOnceToast(
  type: "success" | "error" | "info" | "warning",
  title: string,
  description?: string
) {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    switch (type) {
      case "success":
        toast.success(title, description);
        break;
      case "error":
        toast.error(title, description);
        break;
      case "info":
        toast.info(title, description);
        break;
      case "warning":
        toast.warning(title, description);
        break;
    }
  }, [type, title, description]);
}

const toastHasBeenShown = new WeakMap<object, boolean>();

export function showToast(
  type: "success" | "error" | "info" | "warning",
  title: string,
  description?: string,
  once?: object
) {
  // "once" param: must pass same referential object to ensure only fires once (even in React StrictMode)
  if (once) {
    if (toastHasBeenShown.get(once)) return;
    toastHasBeenShown.set(once, true);
  }

  switch (type) {
    case "success":
      toast.success(title, description);
      break;
    case "error":
      toast.error(title, description);
      break;
    case "info":
      toast.info(title, description);
      break;
    case "warning":
      toast.warning(title, description);
      break;
  }
}

