"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import RoleProtectedLayout from "@/components/RoleProtectedLayout";
import StaffHeader from "@/components/layout/StaffHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { usePermissions } from "@/providers/PermissionProvider";
import { usePathname } from "next/navigation";
import UnauthorizedPage from "../unauthorized/page";

const ROUTE_PERMISSIONS: Record<string, string> = {
  "/staff": "Quản lý giao dịch",
  "/staff/readers": "Quản lí độc giả",
  "/staff/staff": "Quản lí nhân viên",
  "/staff/books": "Quản lí sách",
  "/staff/reports": "Báo cáo thống kê",
  "/staff/payments": "Quản lí thanh toán",
  "/staff/setting": "Cài đặt",
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProtectedLayout requiredRole="staff">
      <PermissionCheckWrapper>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background text-foreground">
            <AppSidebar />
            <div className="flex flex-1 flex-col">
              <StaffHeader />
              <main className="flex-1 px-6 py-6">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      </PermissionCheckWrapper>
    </RoleProtectedLayout>
  );
}

function PermissionCheckWrapper({ children }: { children: React.ReactNode }) {
  const { permissions, loading } = usePermissions();
  const pathname = usePathname();

  const requiredPermission = ROUTE_PERMISSIONS[pathname];
  const isAuthorized =
    !requiredPermission || permissions.includes(requiredPermission);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Đang kiểm tra quyền...
      </div>
    );
  }

  if (!isAuthorized) {
    return <UnauthorizedPage />;
  }

  return <>{children}</>;
}
