"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Save, Edit, RefreshCw } from "lucide-react";
import { supabaseClient } from "@/lib/client";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface SystemSetting {
  setting_id: number;
  setting_name: string;
  setting_value: string;
  data_type: string;
  description: string | null;
}

const SystemSettingPage = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(
    null,
  );
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const supabase = supabaseClient();
      const { data, error } = await supabase
        .from("systemsetting")
        .select("*")
        .order("setting_id");

      if (error) {
        throw error;
      }

      setSettings(data || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải cấu hình hệ thống",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const [editDescription, setEditDescription] = useState("");

  const handleEdit = (setting: SystemSetting) => {
    setEditingSetting(setting);
    setEditValue(setting.setting_value);
    setEditDescription(setting.description || "");
  };

  const handleSave = async () => {
    if (!editingSetting) return;

    setSaving(true);
    try {
      const supabase = supabaseClient();
      const { error } = await supabase
        .from("systemsetting")
        .update({
          setting_value: editValue,
          description: editDescription,
        })
        .eq("setting_id", editingSetting.setting_id);

      if (error) {
        throw error;
      }

      setSettings(
        settings.map((s) =>
          s.setting_id === editingSetting.setting_id
            ? { ...s, setting_value: editValue, description: editDescription }
            : s,
        ),
      );

      toast({
        title: "Thành công",
        description: "Đã cập nhật cấu hình hệ thống",
      });

      setEditingSetting(null);
    } catch (error) {
      console.error("Error updating setting:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật cấu hình hệ thống",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingSetting(null);
  };

  const getDisplayValue = (setting: SystemSetting) => {
    if (setting.data_type === "int") {
      return parseInt(setting.setting_value).toLocaleString("vi-VN");
    }
    return setting.setting_value;
  };

  const formatDescription = (desc: string | null) => {
    if (!desc) return "Không có mô tả";
    return desc;
  };

  return (
    <div className="container mx-auto">
      <Card className="shadow-md">
        <CardHeader className="bg-primary/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              Cấu hình hệ thống
            </CardTitle>
          </div>
          <CardDescription>
            Quản lý các thông số cấu hình của hệ thống thư viện
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Đang tải cấu hình...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">ID</TableHead>
                    <TableHead>Tên cấu hình</TableHead>
                    <TableHead>Giá trị</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="w-24 text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.map((setting) => (
                    <TableRow key={setting.setting_id}>
                      <TableCell className="text-center font-medium">
                        {setting.setting_id}
                      </TableCell>
                      <TableCell>{setting.setting_name}</TableCell>
                      <TableCell className="font-medium">
                        {getDisplayValue(setting)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {formatDescription(setting.description)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(setting)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Chỉnh sửa</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editingSetting}
        onOpenChange={(open) => !open && handleCancel()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cấu hình</DialogTitle>
            <DialogDescription>
              {editingSetting?.setting_name}
              {editingSetting?.description && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {editingSetting.description}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Giá trị{" "}
                {editingSetting?.data_type === "int" ? "(Số nguyên)" : ""}
              </label>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                type={editingSetting?.data_type === "int" ? "number" : "text"}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Mô tả</label>
              <Textarea
                className="min-h-[100px]"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Nhập mô tả cho cấu hình này"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemSettingPage;
