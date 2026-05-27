import { createContext, useContext } from "react";

type PermissionContextType = {
  can: (permission: string) => boolean;
};

const PermissionContext = createContext<PermissionContextType | null>(null);

export const usePermission = () => {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermission must be used within PermissionProvider");
  return ctx;
};

export default PermissionContext;
