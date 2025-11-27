"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/providers/PermissionProvider";
import UnauthorizedPage from "@/app/unauthorized/page";

interface ProtectedRouteProps {
  requiredPermission: string;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  children,
}) => {
  const { permissions, loading } = usePermissions();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading) {
      const hasPermission = permissions.includes(requiredPermission);
      setIsAuthorized(hasPermission);
    }
  }, [permissions, loading, requiredPermission]);

  if (loading) {
    return <div className="flex justify-center p-8">Kiểm tra quyền...</div>;
  }

  if (isAuthorized === false) {
    return <UnauthorizedPage />;
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  return null;
};

export default ProtectedRoute;
