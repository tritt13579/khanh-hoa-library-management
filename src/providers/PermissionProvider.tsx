"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type PermissionContextType = {
  permissions: string[];
  loading: boolean;
  fetchPermissions: () => Promise<void>;
  clearPermissions: () => void;
  hasPermission: (permission: string) => boolean;
};

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined,
);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/staff/permission`,
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch permissions");
      }

      const json = await res.json();
      const newPermissions = json.permissions || [];
      setPermissions(newPermissions);
    } catch (err) {
      console.error("Error fetching permissions", err);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const clearPermissions = () => {
    setPermissions([]);
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        fetchPermissions,
        clearPermissions,
        hasPermission,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
};
