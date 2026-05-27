// src/lib/toast/toast.ts
import type { ToastManager } from "@base-ui/react";

let manager: ToastManager | null = null;

export function bindToastManager(m: ToastManager | null) {
  manager = m;
}

type ToastOptions = Parameters<ToastManager["add"]>[0];
type ToastId = ReturnType<ToastManager["add"]>;

type AppToastOptions = {
  duration?: number;
  showProgressBar?: boolean;
  [key: string]: unknown;
};

type ToastStatusType = "success" | "error" | "info" | "warning";

type AppToastData = AppToastOptions & {
  type?: ToastStatusType;
  loading?: boolean;
};

type PromiseToastState =
  | string
  | {
      title: string;
      description?: string;
      options?: AppToastOptions;
    };

type PromiseToastResolver<Value> =
  | PromiseToastState
  | ((value: Value) => PromiseToastState);

function baseToast(options: ToastOptions) {
  if (!manager) {
    if (typeof window !== "undefined" && (window as any).NODE_ENV !== "production") {
      console.warn("ToastManager belum siap");
    }
    return undefined;
  }

  return manager.add(options);
}

function normalizeToastOptions(
  type: ToastStatusType,
  title: string,
  description?: string,
  options?: AppToastOptions
): ToastOptions {
  const { duration, ...rest } = options || {};

  return {
    title,
    description,
    ...(typeof duration === "number" ? { timeout: duration } : {}),
    data: {
      type,
      ...(typeof duration === "number" ? { duration } : {}),
      ...rest,
    } satisfies AppToastData,
  };
}

function resolvePromiseState<Value>(
  state: PromiseToastResolver<Value>,
  value: Value
): {
  title: string;
  description?: string;
  options?: AppToastOptions;
} {
  const resolved = typeof state === "function" ? state(value) : state;

  if (typeof resolved === "string") {
    return { title: resolved };
  }

  return resolved;
}

export const toast = {
  success(title: string, description?: string, options?: AppToastOptions) {
    return baseToast(normalizeToastOptions("success", title, description, options));
  },

  error(title: string, description?: string, options?: AppToastOptions) {
    return baseToast(normalizeToastOptions("error", title, description, options));
  },

  info(title: string, description?: string, options?: AppToastOptions) {
    return baseToast(normalizeToastOptions("info", title, description, options));
  },

  warning(title: string, description?: string, options?: AppToastOptions) {
    return baseToast(normalizeToastOptions("warning", title, description, options));
  },

  loading(title: string, description?: string, options?: AppToastOptions) {
    const { duration, ...rest } = options || {};

    return baseToast({
      title,
      description,
      timeout: 0,
      data: {
        type: "info",
        loading: true,
        showProgressBar: false,
        ...(typeof duration === "number" ? { duration } : {}),
        ...rest,
      } satisfies AppToastData,
    });
  },

  close(id: ToastId) {
    if (!manager) return;

    manager.close(id);
  },

  async promise<Value>(
    promiseValue: Promise<Value>,
    states: {
      loading: PromiseToastState;
      success: PromiseToastResolver<Value>;
      error: PromiseToastResolver<any>;
    }
  ) {
    const loadingState = resolvePromiseState(states.loading, undefined as never);
    const loadingToastId = toast.loading(
      loadingState.title,
      loadingState.description,
      loadingState.options
    );

    try {
      const result = await promiseValue;
      const successState = resolvePromiseState(states.success, result);

      if (loadingToastId) {
        toast.close(loadingToastId);
      }

      toast.success(successState.title, successState.description, {
        duration: 3000,
        ...successState.options,
      });

      return result;
    } catch (error) {
      const errorState = resolvePromiseState(states.error, error);

      if (loadingToastId) {
        toast.close(loadingToastId);
      }

      toast.error(errorState.title, errorState.description, {
        duration: 4000,
        ...errorState.options,
      });

      throw error;
    }
  },

  custom(options: ToastOptions) {
    return baseToast(options);
  },
};
