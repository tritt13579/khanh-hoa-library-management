"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileBarChart2,
  LayoutDashboard,
  Users,
  UserCog,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { usePermissions } from "@/providers/PermissionProvider";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ElementType;
  requiredPermission: string;
  children?: MenuItem[];
};

const allItems: MenuItem[] = [
  {
    title: "Mượn/Trả sách",
    url: "/staff/",
    icon: LayoutDashboard,
    requiredPermission: "Quản lý giao dịch",
  },
  {
    title: "Độc giả",
    url: "/staff/readers",
    icon: Users,
    requiredPermission: "Quản lí độc giả",
  },
  {
    title: "Nhân viên",
    url: "/staff/staff",
    icon: UserCog,
    requiredPermission: "Quản lí nhân viên",
  },
  {
    title: "Sách",
    url: "/staff/books",
    icon: BookOpen,
    requiredPermission: "Quản lí sách",
  },
  {
    title: "Báo cáo thống kê",
    url: "/staff/reports",
    icon: FileBarChart2,
    requiredPermission: "Báo cáo thống kê",
  },
  {
    title: "Thanh toán",
    url: "/staff/payments",
    icon: FileBarChart2,
    requiredPermission: "Quản lí thanh toán",
  },
  {
    title: "Cài đặt",
    url: "/staff/setting",
    icon: Settings,
    requiredPermission: "Cài đặt",
    children: [
      {
        title: "Phân quyền",
        url: "/staff/setting/role-permission",
        icon: ShieldCheck,
        requiredPermission: "Cài đặt",
      },
      {
        title: "Cấu hình hệ thống",
        url: "/staff/setting/system-settings",
        icon: SlidersHorizontal,
        requiredPermission: "Cài đặt",
      },
    ],
  },
];

export function AppSidebar() {
  const { permissions, loading } = usePermissions();
  const pathname = usePathname();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const initialOpenState = useMemo(() => {
    const initialState: Record<string, boolean> = {};

    allItems.forEach((item) => {
      if (item.children) {
        const isActive = item.children.some((child) =>
          pathname.startsWith(child.url),
        );
        if (isActive) {
          initialState[item.title] = true;
        }
      }
    });

    return initialState;
  }, [pathname]);

  React.useEffect(() => {
    setOpenMenus(initialOpenState);
  }, [initialOpenState]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const allowedItems = useMemo(() => {
    return allItems
      .filter((item) => permissions.includes(item.requiredPermission))
      .map((item) => {
        if (item.children) {
          const allowedChildren = item.children.filter((child) =>
            permissions.includes(child.requiredPermission),
          );
          return { ...item, children: allowedChildren };
        }
        return item;
      });
  }, [permissions]);

  if (loading) {
    return (
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Library Management System</SidebarGroupLabel>
            <SidebarGroupContent className="pt-2">
              <div className="p-4">Loading menu...</div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Library Management System</SidebarGroupLabel>
          <SidebarGroupContent className="pt-2">
            <SidebarMenu>
              {allowedItems.map((item) => {
                if (item.children && item.children.length > 0) {
                  const isOpen = openMenus[item.title];
                  const isAnyChildActive = item.children.some(
                    (child) => pathname === child.url,
                  );

                  return (
                    <SidebarMenuItem key={item.title}>
                      <Collapsible
                        open={isOpen}
                        onOpenChange={() => toggleMenu(item.title)}
                        className="w-full"
                      >
                        <CollapsibleTrigger className="flex w-full items-center rounded-md p-2 hover:bg-accent">
                          <div className="flex w-full items-center justify-between">
                            <div className="flex items-center">
                              <item.icon className="mr-2 h-4 w-4" />
                              <span
                                className={cn(
                                  isAnyChildActive && "font-medium",
                                )}
                              >
                                {item.title}
                              </span>
                            </div>
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-1 space-y-1 pl-6">
                            {item.children.map((child) => (
                              <Link
                                key={child.title}
                                href={child.url}
                                className={cn(
                                  "flex items-center rounded-md p-2 text-sm hover:bg-accent",
                                  pathname === child.url
                                    ? "bg-accent font-medium"
                                    : "",
                                )}
                              >
                                <child.icon className="mr-2 h-4 w-4" />
                                <span>{child.title}</span>
                              </Link>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        className={
                          pathname === item.url ? "bg-accent font-medium" : ""
                        }
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
