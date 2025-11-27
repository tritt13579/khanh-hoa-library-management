import Link from "next/link";
import DarkModeToggle from "./DarkModeToggle";
import { SidebarTrigger } from "../ui/sidebar";
import UserDropdown from "./UserDropdown";

function StaffHeader() {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-background px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="rounded-md hover:bg-muted"></SidebarTrigger>
        <Link href="/" className="text-xl font-bold tracking-wide">
          Library Management
        </Link>
      </div>

      <div className="flex gap-4">
        <DarkModeToggle />

        <UserDropdown />
      </div>
    </header>
  );
}

export default StaffHeader;
