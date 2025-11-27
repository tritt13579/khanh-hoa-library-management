"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Trash2, Edit2, Save } from "lucide-react";
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

const RolePermissionManager = () => {
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

      const { error: deletePermError } = await supabase
        .from("haspermissions")
        .delete()
        .eq("role_id", roleId);

      if (deletePermError) throw deletePermError;

      const { error } = await supabase
        .from("role")
        .delete()
        .eq("role_id", roleId);

      if (error) throw error;

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
        const { error } = await supabase
          .from("haspermissions")
          .insert([{ role_id: roleId, permission_id: permissionId }]);

        if (error) throw error;

        setRolePermissions([
          ...rolePermissions,
          { role_id: roleId, permission_id: permissionId },
        ]);
      } else {
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
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Quản lý vai trò và phân quyền</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Danh sách vai trò */}
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Vai trò</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddRoleModalOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" /> Thêm vai trò
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {roles.map((role) => (
                  <div
                    key={role.role_id}
                    className={`flex cursor-pointer items-center justify-between rounded-md border p-3 ${
                      selectedRole?.role_id === role.role_id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => handleRoleSelect(role)}
                  >
                    <div>
                      <h3 className="font-medium">{role.role_name}</h3>
                      {role.description && (
                        <p className="max-w-[200px] truncate text-sm text-gray-500">
                          {role.description}
                        </p>
                      )}
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getRolePermissions(role.role_id).length} quyền
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.role_id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                {roles.length === 0 && (
                  <div className="py-6 text-center text-gray-500">
                    Chưa có vai trò nào
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chi tiết vai trò và quyền */}
        <Card className="md:col-span-2">
          {selectedRole ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedRole.role_name}</CardTitle>
                    <CardDescription>
                      {selectedRole.description}
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsEditPermissionsModalOpen(true)}>
                    Chỉnh sửa quyền
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="mb-3 font-medium">Danh sách quyền</h3>
                {getRolePermissions(selectedRole.role_id).length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {getRolePermissions(selectedRole.role_id).map(
                      (permission) => (
                        <div
                          key={permission.permission_id}
                          className="flex items-center space-x-2 rounded-md border p-2"
                        >
                          <Check className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="font-medium">
                              {permission.permission_name}
                            </div>
                            {permission.description && (
                              <div className="text-sm text-gray-500">
                                {permission.description}
                              </div>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-gray-500">
                    Vai trò này chưa được gán quyền nào
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <div className="flex h-[500px] items-center justify-center text-gray-500">
              Chọn một vai trò để xem chi tiết
            </div>
          )}
        </Card>
      </div>

      {/* Modal thêm vai trò */}
      <Dialog open={isAddRoleModalOpen} onOpenChange={setIsAddRoleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm vai trò mới</DialogTitle>
            <DialogDescription>
              Thêm vai trò mới và mô tả chức năng của vai trò.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Tên vai trò</Label>
              <Input
                id="roleName"
                placeholder="Nhập tên vai trò"
                value={newRole.role_name}
                onChange={(e) =>
                  setNewRole({ ...newRole, role_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDescription">Mô tả (tùy chọn)</Label>
              <Textarea
                id="roleDescription"
                placeholder="Nhập mô tả vai trò"
                value={newRole.description}
                onChange={(e) =>
                  setNewRole({ ...newRole, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddRoleModalOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleAddRole} disabled={isLoading}>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Chỉnh sửa vai trò</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {roles.find((r) => r.role_id === editingRoleId) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="editRoleName">Tên vai trò</Label>
                    <Input
                      id="editRoleName"
                      placeholder="Nhập tên vai trò"
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
                    <Label htmlFor="editRoleDescription">
                      Mô tả (tùy chọn)
                    </Label>
                    <Textarea
                      id="editRoleDescription"
                      placeholder="Nhập mô tả vai trò"
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
              <Button variant="outline" onClick={() => setEditingRoleId(null)}>
                Hủy
              </Button>
              <Button
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Phân quyền cho vai trò: {selectedRole?.role_name}
            </DialogTitle>
            <DialogDescription>
              Chọn các quyền mà vai trò này có thể thực hiện
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Tên quyền</TableHead>
                    <TableHead>Mô tả</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((permission) => (
                    <TableRow key={permission.permission_id}>
                      <TableCell>
                        <Checkbox
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
                      <TableCell>{permission.permission_name}</TableCell>
                      <TableCell>{permission.description}</TableCell>
                    </TableRow>
                  ))}
                  {permissions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        Chưa có quyền nào được định nghĩa
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsEditPermissionsModalOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolePermissionManager;
