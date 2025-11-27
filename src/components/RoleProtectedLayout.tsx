// components/RoleProtectedLayout.tsx
"use client";

import { useRole } from "@/hooks/use-role";
import { PropsWithChildren } from "react";
import { Loader2 } from "lucide-react";

type RoleProtectedLayoutProps = PropsWithChildren<{
  requiredRole: "reader" | "staff";
}>;

export default function RoleProtectedLayout({
  children,
  requiredRole,
}: RoleProtectedLayoutProps) {
  const { role, loading } = useRole({ requiredRole });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Đang tải...</span>
      </div>
    );
  }

  return <>{children}</>;
}
