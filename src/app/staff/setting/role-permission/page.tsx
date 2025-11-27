"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Trash2, Edit2, ShieldCheck, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabaseClient } from "@/lib/client";
import { toast } from "@/hooks/use-toast";

// Định nghĩa các kiểu dữ liệu
interface Role {
  role_id: number;
  role_name: string;
  description: string | null;
}

interface Permission {
  permission_id: number;
  permission_name: string;
  description: string | null;
}

interface RolePermission {
  role_id: number;
  permission_id: number;
}

const RolePermissionPage = () => {
  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isEditPermissionsModalOpen, setIsEditPermissionsModalOpen] =
    useState(false);
  const [newRole, setNewRole] = useState({ role_name: "", description: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  // Fetch data
  const fetchRoles = async () => {
    try {
      const supabase = supabaseClient();
      const { data, error } = await supabase
        .from("role")
        .select("*")
        .order("role_id");
      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách vai trò.",
        variant: "destructive",
      });
    }
  };

  const fetchPermissions = async () => {
    try {
      const supabase = supabaseClient();
      const { data, error } = await supabase
        .from("permission")
        .select("*")
        .order("permission_id");
      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách quyền.",
        variant: "destructive",
      });
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const supabase = supabaseClient();
      const { data, error } = await supabase.from("haspermissions").select("*");
      if (error) throw error;
      setRolePermissions(data || []);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin phân quyền.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
    fetchRolePermissions();
  }, []);

  // Helpers
  const hasPermission = (roleId: number, permissionId: number) => {
    return rolePermissions.some(
      (rp) => rp.role_id === roleId && rp.permission_id === permissionId,
    );
  };

  const getRolePermissions = (roleId: number) => {
    return permissions.filter((permission) =>
      rolePermissions.some(
        (rp) =>
          rp.role_id === roleId &&
          rp.permission_id === permission.permission_id,
      ),
    );
  };

  // Event handlers
  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const handleAddRole = async () => {
    if (!newRole.role_name.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên vai trò không được để trống.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const supabase = supabaseClient();
      const { data, error } = await supabase
        .from("role")
        .insert([newRole])
        .select();

      if (error) throw error;

      setRoles([...roles, data[0]]);
      setNewRole({ role_name: "", description: "" });
      setIsAddRoleModalOpen(false);
      toast({
        title: "Thành công",
        description: "Đã thêm vai trò mới.",
      });
    } catch (error) {
      console.error("Error adding role:", error);
      toast({
        title: "Lỗi",
        description: "Không thể thêm vai trò mới.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (
    roleId: number,
    updatedData: Partial<Role>,
  ) => {
    try {
      setIsLoading(true);
      const supabase = supabaseClient();
      const { error } = await supabase
        .from("role")
        .update(updatedData)
        .eq("role_id", roleId);

      if (error) throw error;

      // Update local state
      setRoles(
        roles.map((role) =>
          role.role_id === roleId ? { ...role, ...updatedData } : role,
        ),
      );

      setEditingRoleId(null);
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin vai trò.",
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật vai trò.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    // Check if the role is being used by any staff
    try {
      const supabase = supabaseClient();
      const { data: staffWithRole, error: staffError } = await supabase
        .from("staff")
        .select("staff_id")
        .eq("role_id", roleId);

      if (staffError) throw staffError;

      if (staffWithRole && staffWithRole.length > 0) {
        toast({
          title: "Không thể xóa",
          description: "Vai trò này đang được sử dụng bởi nhân viên.",
          variant: "destructive",
        });
        return;
      }

      // Delete all permissions for this role first
      const { error: deletePermError } = await supabase
        .from("haspermissions")
        .delete()
        .eq("role_id", roleId);

      if (deletePermError) throw deletePermError;

      // Then delete the role
      const { error } = await supabase
        .from("role")
        .delete()
        .eq("role_id", roleId);

      if (error) throw error;

      // Update local state
      setRoles(roles.filter((role) => role.role_id !== roleId));
      setRolePermissions(rolePermissions.filter((rp) => rp.role_id !== roleId));

      if (selectedRole?.role_id === roleId) {
        setSelectedRole(null);
      }

      toast({
        title: "Thành công",
        description: "Đã xóa vai trò.",
      });
    } catch (error) {
      console.error("Error deleting role:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa vai trò.",
        variant: "destructive",
      });
    }
  };

  const handleTogglePermission = async (
    roleId: number,
    permissionId: number,
    isChecked: boolean,
  ) => {
    try {
      const supabase = supabaseClient();

      if (isChecked) {
        // Add permission
        const { error } = await supabase
          .from("haspermissions")
          .insert([{ role_id: roleId, permission_id: permissionId }]);

        if (error) throw error;

        setRolePermissions([
          ...rolePermissions,
          { role_id: roleId, permission_id: permissionId },
        ]);
      } else {
        // Remove permission
        const { error } = await supabase
          .from("haspermissions")
          .delete()
          .eq("role_id", roleId)
          .eq("permission_id", permissionId);

        if (error) throw error;

        setRolePermissions(
          rolePermissions.filter(
            (rp) =>
              !(rp.role_id === roleId && rp.permission_id === permissionId),
          ),
        );
      }
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật quyền.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="pb-16">
        <div className="container mx-auto p-4">
          <div className="mb-8 flex items-center">
            <div className="mr-2 rounded-lg bg-primary p-2 text-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">
              Quản lý vai trò và phân quyền
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Danh sách vai trò */}
            <Card className="border-border bg-card md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-primary" />
                  <CardTitle>Vai trò</CardTitle>
                </div>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  size="sm"
                  onClick={() => setIsAddRoleModalOpen(true)}
                >
                  <Plus className="mr-1 h-4 w-4" /> Thêm vai trò
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <div
                        key={role.role_id}
                        className={`flex cursor-pointer items-center justify-between rounded-md border p-3 transition-all ${
                          selectedRole?.role_id === role.role_id
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border hover:border-primary/30 hover:bg-accent"
                        }`}
                        onClick={() => handleRoleSelect(role)}
                      >
                        <div>
                          <h3 className="font-medium text-foreground">
                            {role.role_name}
                          </h3>
                          {role.description && (
                            <p className="max-w-[200px] truncate text-sm text-muted-foreground">
                              {role.description}
                            </p>
                          )}
                          <div className="mt-1">
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium"
                            >
                              {getRolePermissions(role.role_id).length} quyền
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-secondary hover:text-secondary-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRoleId(role.role_id);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role.role_id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {roles.length === 0 && (
                      <div className="flex h-40 items-center justify-center rounded-md border border-dashed py-6 text-center text-muted-foreground">
                        Chưa có vai trò nào
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chi tiết vai trò và quyền */}
            <Card className="border-border bg-card md:col-span-2">
              {selectedRole ? (
                <>
                  <CardHeader className="border-b border-border pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl text-foreground">
                          {selectedRole.role_name}
                        </CardTitle>
                        <CardDescription className="mt-1 text-muted-foreground">
                          {selectedRole.description || "Không có mô tả"}
                        </CardDescription>
                      </div>
                      <Button
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => setIsEditPermissionsModalOpen(true)}
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" /> Chỉnh sửa quyền
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <h3 className="mb-4 flex items-center font-medium text-foreground">
                      <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                      Danh sách quyền
                    </h3>
                    {getRolePermissions(selectedRole.role_id).length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {getRolePermissions(selectedRole.role_id).map(
                          (permission) => (
                            <div
                              key={permission.permission_id}
                              className="flex items-center space-x-3 rounded-md border border-border bg-card/50 p-3 shadow-sm"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Check className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium text-foreground">
                                  {permission.permission_name}
                                </div>
                                {permission.description && (
                                  <div className="text-sm text-muted-foreground">
                                    {permission.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-md border border-dashed py-6 text-center text-muted-foreground">
                        Vai trò này chưa được gán quyền nào
                      </div>
                    )}
                  </CardContent>
                </>
              ) : (
                <div className="flex h-[500px] items-center justify-center rounded-md border-2 border-dashed border-muted text-muted-foreground">
                  <div className="text-center">
                    <ShieldCheck className="mx-auto mb-2 h-12 w-12 text-muted-foreground/60" />
                    <p>Chọn một vai trò để xem chi tiết</p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Modal thêm vai trò */}
          <Dialog
            open={isAddRoleModalOpen}
            onOpenChange={setIsAddRoleModalOpen}
          >
            <DialogContent className="bg-card text-card-foreground">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  Thêm vai trò mới
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Thêm vai trò mới và mô tả chức năng của vai trò.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="roleName" className="text-foreground">
                    Tên vai trò
                  </Label>
                  <Input
                    id="roleName"
                    placeholder="Nhập tên vai trò"
                    className="border-input bg-background text-foreground"
                    value={newRole.role_name}
                    onChange={(e) =>
                      setNewRole({ ...newRole, role_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleDescription" className="text-foreground">
                    Mô tả (tùy chọn)
                  </Label>
                  <Textarea
                    id="roleDescription"
                    placeholder="Nhập mô tả vai trò"
                    className="border-input bg-background text-foreground"
                    value={newRole.description || ""}
                    onChange={(e) =>
                      setNewRole({ ...newRole, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="border-border bg-background text-foreground hover:bg-secondary hover:text-secondary-foreground"
                  onClick={() => setIsAddRoleModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleAddRole}
                  disabled={isLoading}
                >
                  {isLoading ? "Đang xử lý..." : "Thêm vai trò"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal chỉnh sửa vai trò */}
          {editingRoleId !== null && (
            <Dialog
              open={editingRoleId !== null}
              onOpenChange={(open) => !open && setEditingRoleId(null)}
            >
              <DialogContent className="bg-card text-card-foreground">
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    Chỉnh sửa vai trò
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {roles.find((r) => r.role_id === editingRoleId) && (
                    <>
                      <div className="space-y-2">
                        <Label
                          htmlFor="editRoleName"
                          className="text-foreground"
                        >
                          Tên vai trò
                        </Label>
                        <Input
                          id="editRoleName"
                          placeholder="Nhập tên vai trò"
                          className="border-input bg-background text-foreground"
                          defaultValue={
                            roles.find((r) => r.role_id === editingRoleId)
                              ?.role_name
                          }
                          onChange={(e) => {
                            const updatedRole = roles.find(
                              (r) => r.role_id === editingRoleId,
                            );
                            if (updatedRole) {
                              updatedRole.role_name = e.target.value;
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="editRoleDescription"
                          className="text-foreground"
                        >
                          Mô tả (tùy chọn)
                        </Label>
                        <Textarea
                          id="editRoleDescription"
                          placeholder="Nhập mô tả vai trò"
                          className="border-input bg-background text-foreground"
                          defaultValue={
                            roles.find((r) => r.role_id === editingRoleId)
                              ?.description || ""
                          }
                          onChange={(e) => {
                            const updatedRole = roles.find(
                              (r) => r.role_id === editingRoleId,
                            );
                            if (updatedRole) {
                              updatedRole.description = e.target.value;
                            }
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="border-border bg-background text-foreground hover:bg-secondary hover:text-secondary-foreground"
                    onClick={() => setEditingRoleId(null)}
                  >
                    Hủy
                  </Button>
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => {
                      const roleToUpdate = roles.find(
                        (r) => r.role_id === editingRoleId,
                      );
                      if (roleToUpdate) {
                        handleUpdateRole(editingRoleId, {
                          role_name: roleToUpdate.role_name,
                          description: roleToUpdate.description,
                        });
                      }
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? "Đang xử lý..." : "Lưu thay đổi"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Modal chỉnh sửa quyền */}
          <Dialog
            open={isEditPermissionsModalOpen && selectedRole !== null}
            onOpenChange={setIsEditPermissionsModalOpen}
          >
            <DialogContent className="max-w-3xl bg-card text-card-foreground">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  Phân quyền cho vai trò: {selectedRole?.role_name}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Chọn các quyền mà vai trò này có thể thực hiện
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="mb-4">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="font-medium">Tên quyền</TableHead>
                        <TableHead className="font-medium">Mô tả</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.map((permission) => (
                        <TableRow
                          key={permission.permission_id}
                          className="hover:bg-muted/50"
                        >
                          <TableCell>
                            <Checkbox
                              className="border-primary text-primary"
                              checked={hasPermission(
                                selectedRole?.role_id || 0,
                                permission.permission_id,
                              )}
                              onCheckedChange={(checked) => {
                                if (selectedRole) {
                                  handleTogglePermission(
                                    selectedRole.role_id,
                                    permission.permission_id,
                                    !!checked,
                                  );
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {permission.permission_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {permission.description || "Không có mô tả"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {permissions.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-24 text-center text-muted-foreground"
                          >
                            Chưa có quyền nào được định nghĩa
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setIsEditPermissionsModalOpen(false)}
                >
                  Đóng
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionPage;
