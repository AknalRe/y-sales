import type { ReactNode } from "react";

type CanProps = {
  can: (permission: string) => boolean;
  permission: string;
  children: ReactNode;
};

export const Can = ({ can, permission, children }: CanProps) => {
  if (!can(permission)) return null; // tidak render kalau permission false
  return <>{children}</>;
};
