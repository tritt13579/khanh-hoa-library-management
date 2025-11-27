"use client";
import React, { useState, useEffect, useMemo } from "react";
import { FolderPlusIcon, Loader2, Search, Filter, Users } from "lucide-react";
import { supabaseClient } from "@/lib/client";
import StaffFormModal from "@/components/StaffFormModal";
import StaffDetailModal from "@/components/StaffDetailModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Role {
  role_id: string;
  role_name: string;
}

interface Staff {
  staff_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  email: string;
  role_id: string;
  role?: Role;
}

interface StaffStats {
  totalStaff: number;
  maleStaff: number;
  femaleStaff: number;
}

const normalizeString = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

const StaffPage = () => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<StaffStats>({
    totalStaff: 0,
    maleStaff: 0,
    femaleStaff: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffToEdit, setStaffToEdit] = useState<Staff | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const supabase = supabaseClient();

  const normalizedSearchTerm = useMemo(() => {
    return normalizeString(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    fetchRoles();
    fetchStaff();
  }, [refreshTrigger]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole]);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase.from("role").select("*");
      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff")
        .select("*, role:role_id(*)")
        .order("staff_id", { ascending: false });

      if (error) throw error;
      setStaff(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (staffData: Staff[]) => {
    const totalStaff = staffData.length;
    const maleStaff = staffData.filter((s) => s.gender === "M").length;
    const femaleStaff = staffData.filter((s) => s.gender === "F").length;

    setStats({
      totalStaff,
      maleStaff,
      femaleStaff,
    });
  };

  const filteredStaff = useMemo(() => {
    return staff.filter((staffMember) => {
      // Search filter
      const fullName = `${staffMember.last_name} ${staffMember.first_name}`;
      const nameMatches = searchTerm
        ? normalizeString(fullName).includes(normalizedSearchTerm)
        : true;

      const emailMatches = searchTerm
        ? normalizeString(staffMember.email).includes(normalizedSearchTerm)
        : true;

      const idMatches = searchTerm
        ? staffMember.staff_id.toString().includes(searchTerm)
        : true;

      const matchesSearch =
        searchTerm === "" || nameMatches || emailMatches || idMatches;

      // Role filter
      const matchesRole =
        selectedRole === "all" || staffMember.role_id === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [staff, normalizedSearchTerm, selectedRole, searchTerm]);

  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredStaff.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredStaff, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredStaff.length / itemsPerPage);
  }, [filteredStaff.length, itemsPerPage]);

  const displayInfo = useMemo(() => {
    const indexOfFirstItem = (currentPage - 1) * itemsPerPage + 1;
    const indexOfLastItem = Math.min(
      currentPage * itemsPerPage,
      filteredStaff.length,
    );
    return { indexOfFirstItem, indexOfLastItem };
  }, [currentPage, itemsPerPage, filteredStaff.length]);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    toast({
      title: "Thành công",
      description: "Dữ liệu đã được cập nhật thành công.",
      variant: "success",
    });
  };

  const openModal = (mode: "add" | "detail" | "edit", staff?: Staff) => {
    if (mode === "add") {
      setIsAddOpen(true);
      setStaffToEdit(null);
    } else if (mode === "detail") {
      setSelectedStaff(staff || null);
      setIsDetailOpen(true);
    } else if (mode === "edit") {
      setStaffToEdit(staff || null);
      setIsEditOpen(true);
    }
  };

  const closeModal = () => {
    setIsAddOpen(false);
    setIsDetailOpen(false);
    setIsEditOpen(false);
    setStaffToEdit(null);
    setSelectedStaff(null);
  };

  const handleDelete = (deletedId: string) => {
    setStaff((prev) => prev.filter((s) => s.staff_id !== deletedId));
    closeModal();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case "M":
        return "Nam";
      case "F":
        return "Nữ";
      default:
        return "Khác";
    }
  };

  const getGenderBadgeVariant = (gender: string) => {
    switch (gender) {
      case "M":
        return "default";
      case "F":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý nhân viên</h1>
          <p className="text-muted-foreground">
            Tổng số {stats.totalStaff} nhân viên ({stats.maleStaff} nam,{" "}
            {stats.femaleStaff} nữ)
          </p>
        </div>
        <Button
          onClick={() => openModal("add")}
          className="flex items-center space-x-2"
        >
          <FolderPlusIcon className="h-4 w-4" />
          <span>Thêm nhân viên</span>
        </Button>
      </div>

      {/* Combined Filters and Table */}
      <Card>
        <CardContent className="pt-4">
          {/* Filters */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex w-full items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo ID, tên, email..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Chọn chức vụ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả chức vụ</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.role_id} value={role.role_id}>
                      {role.role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Chức vụ</TableHead>
                <TableHead>Ngày sinh</TableHead>
                <TableHead>Giới tính</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((staffMember) => (
                <TableRow
                  key={staffMember.staff_id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    {staffMember.staff_id}
                  </TableCell>
                  <TableCell>
                    {staffMember.last_name} {staffMember.first_name}
                  </TableCell>
                  <TableCell>{staffMember.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {staffMember.role?.role_name || "Không rõ"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(staffMember.date_of_birth)}</TableCell>
                  <TableCell>
                    <Badge variant={getGenderBadgeVariant(staffMember.gender)}>
                      {getGenderLabel(staffMember.gender)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal("detail", staffMember)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Xem chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="flex justify-between border-t p-4">
          <div className="text-sm text-muted-foreground">
            {filteredStaff.length > 0 ? (
              <>
                Hiển thị {displayInfo.indexOfFirstItem}-
                {displayInfo.indexOfLastItem} trong tổng số{" "}
                {filteredStaff.length} nhân viên
              </>
            ) : (
              <>Không có nhân viên nào phù hợp với điều kiện tìm kiếm</>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Trước
            </Button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageToShow;
              if (totalPages <= 5) {
                pageToShow = i + 1;
              } else if (currentPage <= 3) {
                pageToShow = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageToShow = totalPages - 4 + i;
              } else {
                pageToShow = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageToShow}
                  variant={currentPage === pageToShow ? "default" : "outline"}
                  size="sm"
                  onClick={() => paginate(pageToShow)}
                >
                  {pageToShow}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Sau
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Modals */}
      <StaffDetailModal
        isOpen={isDetailOpen}
        staff={selectedStaff}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(staff) => {
          openModal("edit", staff);
          setIsDetailOpen(false);
        }}
        onDelete={handleDelete}
        onSuccess={handleSuccess}
      />

      <StaffFormModal
        isAddOpen={isAddOpen}
        isEditOpen={isEditOpen}
        staffData={staffToEdit}
        closeAdd={closeModal}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default StaffPage;
