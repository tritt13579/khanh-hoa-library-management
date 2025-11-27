// hooks/useRole.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RoleHookProps = {
  requiredRole?: "reader" | "staff";
  redirectTo?: string;
};

export function useRole({
  requiredRole,
  redirectTo = "/unauthorized",
}: RoleHookProps = {}) {
  const [role, setRole] = useState<"reader" | "staff" | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchRole() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/role`,
        );
        const data = await response.json();

        setRole(data.role);

        if (requiredRole && data.role !== requiredRole) {
          router.push(redirectTo);
        }
      } catch (error) {
        console.error("Error fetching role:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [requiredRole, redirectTo, router]);

  return { role, loading };
}
