"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface StaffFormModalProps {
  isAddOpen: boolean;
  isEditOpen: boolean;
  closeAdd: () => void;
  staffData?: any;
  onSuccess?: () => void;
}

interface Role {
  id: number;
  name: string;
}

const StaffFormModal: React.FC<StaffFormModalProps> = ({
  isAddOpen,
  isEditOpen,
  closeAdd,
  staffData,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  const isOpen = isAddOpen || isEditOpen;

  const DatePickerSingle: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  }> = ({ value, onChange, placeholder }) => {
    const [open, setOpen] = useState(false);

    const selectedDate = value ? new Date(value) : undefined;

    const handleSelect = (date: Date | undefined) => {
      if (!date) return;
      const iso = format(date, "yyyy-MM-dd");
      onChange(iso);
      setOpen(false);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: vi }) : (placeholder || "Chọn ngày")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={vi}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    );
  };

  useEffect(() => {
    if (staffData && isEditOpen) {
      setFirstName(staffData.first_name || "");
      setLastName(staffData.last_name || "");
      setDob(staffData.date_of_birth || "");
      setGender(staffData.gender === "M" ? "Nam" : "Nữ");
      setEmail(staffData.email || "");
      setRole(staffData.role_id?.toString() || "");
      setPhone(staffData.phone || "");
      setAddress(staffData.address || "");
      setHireDate(staffData.hire_date || "");
    }
  }, [staffData, isEditOpen]);

  useEffect(() => {
    const supabase = supabaseClient();
    const fetchRoles = async () => {
      const { data, error } = await supabase.from("role").select("role_id, role_name");
      if (!error && data) {
        setRoles(data.map((r: any) => ({ id: r.role_id, name: r.role_name })));
      }
    };
    fetchRoles();
  }, []);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setDob("");
    setGender("");
    setEmail("");
    setRole("");
    setPhone("");
    setAddress("");
    setHireDate("");
  };

  const handleSubmit = async () => {
    const role_id = parseInt(role);
    if (isNaN(role_id)) {
      toast({
        title: "Chức vụ không hợp lệ",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const staffId = isEditOpen && staffData?.staff_id ? staffData.staff_id : null;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/staff/save`, {
        method: "POST",
        body: JSON.stringify({
          staffId,
          role_id,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob,
          gender: gender === "Nam" ? "M" : "F",
          address,
          phone,
          email,
          hire_date: hireDate,
        }),
      });

      const result = await res.json();
      setLoading(false);

      if (!res.ok) {
        toast({
          title: "Lỗi từ hệ thống",
          description: result?.error || "Đã xảy ra lỗi không xác định",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isEditOpen ? "Cập nhật thành công" : "Thêm nhân viên thành công",
        variant: "success",
      });

      onSuccess?.();
      closeAdd();
      resetForm();
    } catch (err) {
      setLoading(false);
      toast({
        title: "Lỗi kết nối",
        description: "Không thể gửi yêu cầu đến máy chủ",
        variant: "destructive",
      });
      console.error("Fetch error:", err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeAdd}>
      <DialogContent className="max-h-[90vh] w-5/6 max-w-2xl overflow-y-auto bg-background p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-primary">
            {isAddOpen ? "Thêm nhân viên" : "Chỉnh sửa nhân viên"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 mt-4">
          <div>
            <Label>Họ nhân viên</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>

          <div>
            <Label>Tên nhân viên</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>

          <div>
            <Label>Ngày sinh</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Giới tính</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn giới tính" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nam">Nam</SelectItem>
                  <SelectItem value="Nữ">Nữ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Số điện thoại</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Ngày vào làm</Label>
              <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Chức vụ</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn chức vụ" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Địa chỉ</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              closeAdd();
            }}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffFormModal;
