import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { logOutAction } from "@/actions/users";
import { useAuth } from "@/providers/AuthProvider";
import { usePermissions } from "@/providers/PermissionProvider";
import { getUser } from "@/lib/client";

const UserDropdown = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("Tài khoản");
  const { toast } = useToast();
  const router = useRouter();
  const { clearPermissions } = usePermissions();

  useEffect(() => {
    const updateUserInfo = async () => {
      if (user?.full_name) {
        setDisplayName(user.full_name);
      } else {
        try {
          const userObj = await getUser();
          if (userObj?.user_metadata?.full_name) {
            setDisplayName(userObj.user_metadata.full_name);

            setUser({
              full_name: userObj.user_metadata.full_name,
              role: userObj.user_metadata?.role || null,
              staff_id: userObj.user_metadata?.staff_id || null,
            });
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      }
    };

    updateUserInfo();
  }, [user, setUser]);

  const handleLogout = async () => {
    setLoading(true);
    const { errorMessage, role } = await logOutAction();
    if (!errorMessage) {
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
        variant: "success",
      });
      setUser(null);
      setDisplayName("Tài khoản");
      if (role === "reader") {
        router.replace("/reader");
      } else {
        router.replace("/login");
      }
    } else {
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
    clearPermissions();
    setLoading(false);
  };

  const handleProfileRedirect = () => {
    if (user?.role === "reader") {
      router.push("/reader/profile");
    } else {
      router.push("/staff/profile");
    }
  };

  const handleLoanHistoryRedirect = () => {
    router.push("/reader/loans");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[120px] capitalize">
          {displayName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleProfileRedirect}>
          Trang cá nhân
        </DropdownMenuItem>
        {user?.role === "reader" && (
          <DropdownMenuItem onClick={handleLoanHistoryRedirect}>
            Lịch sử mượn
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={loading} onClick={handleLogout}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang thoát...
            </span>
          ) : (
            "Đăng xuất"
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
