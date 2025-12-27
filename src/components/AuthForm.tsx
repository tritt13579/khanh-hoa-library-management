"use client";

import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { CardContent, CardFooter } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useTransition, useState } from "react";
import { loginAction } from "@/actions/users";
import { usePermissions } from "@/providers/PermissionProvider";

const AuthForm = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { fetchPermissions } = usePermissions();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      const { errorMessage, role } = await loginAction(email, password);

      if (!errorMessage) {
        if (role === "staff") {
          await fetchPermissions();
        }

        toast({
          title: "Đăng nhập thành công",
          description: "Chào mừng bạn trở lại!",
          variant: "success",
        });

        if (role === "reader") {
          router.replace("/reader");
        } else if (role === "staff") {
          router.replace("/staff");
        } else {
          router.replace("/");
        }
      } else {
        toast({
          title: "Lỗi",
          description: errorMessage || "Sai tên đăng nhập hoặc mật khẩu",
          variant: "destructive",
        });
      }
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <form action={handleSubmit}>
      <CardContent className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            placeholder="Nhập email"
            type="email"
            required
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              placeholder="Nhập mật khẩu"
              type={showPassword ? "text" : "password"}
              required
              disabled={isPending}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-500" />
              ) : (
                <Eye className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="mt-4 flex flex-col gap-6">
        <Button className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : "Đăng nhập"}
        </Button>
      </CardFooter>
    </form>
  );
};

export default AuthForm;
