"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Eye, EyeOff, Loader2, User as UserIcon, Lock, Save, AlertCircle, CheckCircle, } from "lucide-react";
import { supabaseClient } from "@/lib/client";
import { logOutAction } from "@/actions/users";
import { useRouter } from "next/navigation";
import NoFooterLayout from "@/components/layout/NoFooterLayout";

interface ReaderData {
  reader_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  date_of_birth: string;
  gender: string;
  photo_url?: string | null;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ReaderData | null>(null);
  const [editedProfile, setEditedProfile] = useState<ReaderData | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [verifyingCurrentPassword, setVerifyingCurrentPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const { toast } = useToast();
  const supabase = supabaseClient();

  const validatePassword = useCallback((password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password),
    };
  }, []);

  const passwordValidation = validatePassword(passwordForm.newPassword);
  const isPasswordStrong = Object.values(passwordValidation).every(Boolean);

  const passwordsMatch = passwordForm.newPassword === passwordForm.confirmPassword;
  const showPasswordMismatch = passwordForm.confirmPassword.length > 0 && !passwordsMatch;

  const verifyCurrentPassword = useCallback(async (currentPassword: string): Promise<boolean> => {
    if (!user?.email || !currentPassword) return false;
    try {
      setVerifyingCurrentPassword(true);
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (error) return false;
      return true;
    } catch (e) {
      console.error("Error verifying current password:", e);
      return false;
    } finally {
      setVerifyingCurrentPassword(false);
    }
  }, [user?.email, supabase]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Không thể lấy thông tin người dùng");
      setUser(user);

      const { data: readerData, error: readerError } = await supabase.from("reader").select("*").eq("auth_user_id", user.id).single();
      if (readerError || !readerData) throw new Error("Không tìm thấy thông tin độc giả");

      setProfile(readerData);
      setEditedProfile({ ...readerData });
    } catch (error) {
      console.error("Error fetching reader profile:", error);
      toast({ title: "Lỗi", description: error instanceof Error ? error.message : "Có lỗi khi tải thông tin", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => { fetchUserProfile(); }, [fetchUserProfile]);

  const handleSaveProfile = useCallback(async () => {
    if (!editedProfile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("reader").update(editedProfile).eq("reader_id", editedProfile.reader_id);
      if (error) throw error;
      setProfile(editedProfile);
      toast({ title: "Thành công", description: "Cập nhật thông tin thành công" });
    } catch (error) {
      console.error("Error updating reader profile:", error);
      toast({ title: "Lỗi", description: "Có lỗi xảy ra khi cập nhật thông tin", variant: "destructive" });
    } finally { setSaving(false); }
  }, [editedProfile, supabase, toast]);

  const handleChangePassword = useCallback(async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword.trim()) { toast({ title: "Lỗi", description: "Vui lòng nhập mật khẩu hiện tại", variant: "destructive" }); return; }
    if (!newPassword.trim()) { toast({ title: "Lỗi", description: "Vui lòng nhập mật khẩu mới", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Lỗi", description: "Mật khẩu mới và xác nhận mật khẩu không khớp", variant: "destructive" }); return; }
    if (!isPasswordStrong) { toast({ title: "Mật khẩu không đủ mạnh", description: "Vui lòng kiểm tra các yêu cầu bảo mật phía dưới", variant: "destructive" }); return; }
    if (currentPassword === newPassword) { toast({ title: "Lỗi", description: "Mật khẩu mới phải khác với mật khẩu hiện tại", variant: "destructive" }); return; }

    setChangingPassword(true);
    try {
      const isCurrentPasswordValid = await verifyCurrentPassword(currentPassword);
      if (!isCurrentPasswordValid) { toast({ title: "Lỗi", description: "Mật khẩu hiện tại không đúng", variant: "destructive" }); return; }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Thành công", description: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." });

      const { errorMessage } = await logOutAction();
      if (!errorMessage) { setUser(null); router.replace("/login"); }
      else { toast({ title: "Error", description: errorMessage, variant: "destructive" }); }
    } catch (error) {
      console.error("Error changing reader password:", error);
      let errorMessage = "Có lỗi xảy ra khi đổi mật khẩu";
      if (error instanceof Error) {
        if (error.message.includes("Invalid login credentials")) errorMessage = "Mật khẩu hiện tại không đúng";
        else if (error.message.includes("Password should be at least")) errorMessage = "Mật khẩu mới không đáp ứng yêu cầu bảo mật";
        else errorMessage = error.message;
      }
      toast({ title: "Lỗi", description: errorMessage, variant: "destructive" });
    } finally { setChangingPassword(false); }
  }, [passwordForm, supabase, toast, isPasswordStrong, verifyCurrentPassword, router]);

  const updateProfileField = useCallback((field: keyof ReaderData, value: string) => {
    setEditedProfile((prev) => (prev ? { ...prev, [field]: value } : null));
  }, []);

  const updatePasswordField = useCallback((field: keyof PasswordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const togglePasswordVisibility = useCallback((field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const getInitials = useCallback((firstName: string, lastName: string) => `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(), []);

  const isPasswordFormValid = passwordForm.currentPassword.trim() && passwordForm.newPassword.trim() && passwordForm.confirmPassword.trim() && isPasswordStrong && passwordsMatch;

  if (loading) return (<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /><span className="ml-2">Đang tải thông tin...</span></div>);

  if (!profile || !editedProfile) return (<div className="flex min-h-screen items-center justify-center"><p>Không tìm thấy thông tin độc giả</p></div>);

  return (
    <NoFooterLayout>
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="flex items-center space-x-4 rounded-lg border bg-gradient-to-r from-muted/50 to-accent/50 p-6">
        <Avatar className="h-16 w-16">
          {profile.photo_url ? (
            <AvatarImage src={profile.photo_url} alt={`${profile.first_name} ${profile.last_name}`} className="object-cover" />
          ) : (
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">{getInitials(profile.first_name, profile.last_name)}</AvatarFallback>
          )}
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{profile.first_name} {profile.last_name}</h1>
          <p className="text-muted-foreground">Độc giả</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2"><UserIcon className="h-4 w-4"/> Thông tin cá nhân</TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2"><Lock className="h-4 w-4"/> Đổi mật khẩu</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-lg">Thông tin cá nhân</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">Họ</Label>
                  <Input id="lastName" value={editedProfile.last_name} onChange={(e) => updateProfileField("last_name", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">Tên</Label>
                  <Input id="firstName" value={editedProfile.first_name} onChange={(e) => updateProfileField("first_name", e.target.value)} className="h-9" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input id="email" type="email" value={editedProfile.email} onChange={(e) => updateProfileField("email", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Số điện thoại</Label>
                  <Input id="phone" value={editedProfile.phone || ""} onChange={(e) => updateProfileField("phone", e.target.value)} className="h-9" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-sm font-medium">Ngày sinh</Label>
                  <Input id="dateOfBirth" type="date" value={editedProfile.date_of_birth} onChange={(e) => updateProfileField("date_of_birth", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-medium">Giới tính</Label>
                  <Select value={editedProfile.gender} onValueChange={(value) => updateProfileField("gender", value)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Nam</SelectItem>
                      <SelectItem value="F">Nữ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">Địa chỉ</Label>
                  <Input id="address" value={editedProfile.address || ""} onChange={(e) => updateProfileField("address", e.target.value)} className="h-9" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveProfile} disabled={saving} className="min-w-[120px]">{saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Đang lưu...</>) : (<><Save className="mr-2 h-4 w-4"/> Lưu thay đổi</>)}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-lg">Đổi mật khẩu</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium">Mật khẩu hiện tại *</Label>
                <div className="relative">
                  <Input id="currentPassword" type={showPasswords.current ? "text" : "password"} value={passwordForm.currentPassword} onChange={(e) => updatePasswordField("currentPassword", e.target.value)} className="h-9 pr-10" placeholder="Nhập mật khẩu hiện tại" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 p-0 hover:bg-transparent" onClick={() => togglePasswordVisibility("current")}>{showPasswords.current ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">Mật khẩu mới *</Label>
                <div className="relative">
                  <Input id="newPassword" type={showPasswords.new ? "text" : "password"} value={passwordForm.newPassword} onChange={(e) => updatePasswordField("newPassword", e.target.value)} className="h-9 pr-10" placeholder="Nhập mật khẩu mới" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 p-0 hover:bg-transparent" onClick={() => togglePasswordVisibility("new")}>{showPasswords.new ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</Button>
                </div>

                {passwordForm.newPassword && (
                  <div className="mt-2 space-y-2 rounded-md border bg-muted/50 p-3">
                    <p className="text-sm font-medium text-muted-foreground">Yêu cầu mật khẩu:</p>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      {[{ key: "minLength", text: "Ít nhất 8 ký tự" },{ key: "hasUppercase", text: "Có chữ hoa (A-Z)" },{ key: "hasLowercase", text: "Có chữ thường (a-z)" },{ key: "hasNumber", text: "Có số (0-9)" },{ key: "hasSpecialChar", text: "Có ký tự đặc biệt (!@#$%...)" },].map(({ key, text }) => (
                        <div key={key} className="flex items-center gap-2">{passwordValidation[key as keyof PasswordValidation] ? (<CheckCircle className="h-3 w-3 text-green-600"/>) : (<AlertCircle className="h-3 w-3 text-red-500"/>)}<span className={passwordValidation[key as keyof PasswordValidation] ? "text-green-600" : "text-red-500"}>{text}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Xác nhận mật khẩu *</Label>
                <div className="relative">
                  <Input id="confirmPassword" type={showPasswords.confirm ? "text" : "password"} value={passwordForm.confirmPassword} onChange={(e) => updatePasswordField("confirmPassword", e.target.value)} className={`h-9 pr-10 ${showPasswordMismatch ? "border-red-500" : ""}`} placeholder="Nhập lại mật khẩu mới" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-9 w-9 p-0 hover:bg-transparent" onClick={() => togglePasswordVisibility("confirm")}>{showPasswords.confirm ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</Button>
                </div>
                {showPasswordMismatch && (<p className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3"/> Mật khẩu xác nhận không khớp</p>)}
                {passwordsMatch && passwordForm.confirmPassword && (<p className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="h-3 w-3"/> Mật khẩu khớp</p>)}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleChangePassword} disabled={changingPassword || verifyingCurrentPassword || !isPasswordFormValid} className="min-w-[140px]">{changingPassword ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Đang đổi...</>) : verifyingCurrentPassword ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Đang xác thực...</>) : (<><Lock className="mr-2 h-4 w-4"/> Đổi mật khẩu</>)}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </NoFooterLayout>
  );
};

export default ProfilePage;
