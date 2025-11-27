"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { supabaseClient } from "@/lib/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaymentCardModel from "@/components/PaymentCardModel";

interface ReaderFormModalProps {
  isCreateOpen: boolean;
  isEditOpen: boolean;
  closeCreate: () => void;
  reader?: any;
  onSuccess?: () => void;
}

const ReaderFormModal = ({
  isCreateOpen,
  isEditOpen,
  closeCreate,
  reader,
  onSuccess,
}: ReaderFormModalProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [oldDepositPackageAmount, setOldDepositPackageAmount] = useState(0);
  const [ageLimit, setAgeLimit] = useState<number>(16);
  const [cardFee, setCardFee] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("");

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    address: "",
    phone: "",
    email: "",
    photo_url: "",
    card_type: "",
    deposit_package_id: "none",
  });

  const [depositPackages, setDepositPackages] = useState<
    { id: number; amount: number }[]
  >([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const supabase = supabaseClient();
      const [{ data: ageData }, { data: feeData }] = await Promise.all([
        supabase
          .from("systemsetting")
          .select("setting_value")
          .eq("setting_id", 3)
          .single(),
        supabase
          .from("systemsetting")
          .select("setting_value")
          .eq("setting_id", 12)
          .single(),
      ]);

      if (ageData) setAgeLimit(parseInt(ageData.setting_value, 10));
      if (feeData) setCardFee(parseInt(feeData.setting_value, 10));
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (formData.card_type === "Đọc" && formData.deposit_package_id !== "none") {
      setFormData(prev => ({
        ...prev,
        deposit_package_id: "none"
      }));
    }
  }, [formData.card_type]);

  useEffect(() => {
    const fetchDepositPackages = async () => {
      const supabase = supabaseClient();
      const { data, error } = await supabase
        .from("depositpackage")
        .select("deposit_package_id, package_amount");

      if (data) {
        const packages = data.map((item: any) => ({
          id: item.deposit_package_id,
          amount: item.package_amount,
        }));
        setDepositPackages(packages);
      } else {
        console.error("Lỗi lấy gói đặt cọc:", error?.message);
      }
    };

    fetchDepositPackages();
  }, []);

  useEffect(() => {
    if (isEditOpen && reader) {
      setFormData({
        first_name: reader.first_name || "",
        last_name: reader.last_name || "",
        date_of_birth: reader.date_of_birth || "",
        gender: reader.gender || "",
        address: reader.address || "",
        phone: reader.phone || "",
        email: reader.email || "",
        photo_url: reader.photo_url || "",
        card_type:
          reader.librarycard?.[0]?.card_type === "Thẻ đọc" ? "Đọc" : "Mượn",
        deposit_package_id:
          reader.librarycard?.[0]?.deposit_package_id?.toString() || "none",
      });

      const oldPkg = depositPackages.find(
        (pkg) =>
          pkg.id.toString() ===
          (reader.librarycard?.[0]?.deposit_package_id?.toString() || "")
      );
      setOldDepositPackageAmount(oldPkg?.amount || 0);

    }

  }, [isEditOpen, reader, depositPackages]);

  useEffect(() => {
    if (!isCreateOpen && !isEditOpen) {
      setFormData({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        gender: "",
        address: "",
        phone: "",
        email: "",
        photo_url: "",
        card_type: "",
        deposit_package_id: "none",
      });
      setImageFile(null);
    }
  }, [isCreateOpen, isEditOpen]);

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
  setIsSaving(true);
  const supabase = supabaseClient();
  let uploadedImageUrl = formData.photo_url;
  const age = calculateAge(formData.date_of_birth);

  if (age < ageLimit) {
    toast({
      title: `Độc giả phải từ ${ageLimit} tuổi trở lên.`,
      variant: "destructive",
    });
    setIsSaving(false);
    return;
  }

  if (formData.card_type === "Mượn" && formData.deposit_package_id === "none") {
    toast({
      title: "Vui lòng chọn gói đặt cọc",
      variant: "destructive",
    });
    setIsSaving(false);
    return;
  }

  if (isCreateOpen && !paymentMethod) {
    toast({
      title: "Vui lòng chọn phương thức thanh toán",
      variant: "destructive",
    });
    setIsSaving(false);
    return;
  }

  // Upload ảnh nếu có
  if (imageFile) {
    const fileName = `avatars/readers/${Date.now()}_${imageFile.name}`;
    const { data, error } = await supabase.storage
      .from("images")
      .upload(fileName, imageFile);

    if (error) {
      alert("Không thể tải ảnh lên.");
      setIsSaving(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    uploadedImageUrl = publicUrlData.publicUrl;
  }

  const generateRandomCode = (prefix: string, length = 6) => {
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}0${randomNumber}`;
  };

  const body = {
    ...formData,
    readerId: reader?.reader_id || undefined,
    deposit_package_id: formData.card_type === "Đọc" ? null : parseInt(formData.deposit_package_id),
    card_type: formData.card_type === "Mượn" ? "Thẻ mượn" : "Thẻ đọc",
    photo_url: uploadedImageUrl,
    payment_date: (isCreateOpen || isEditOpen) ? new Date().toISOString() : undefined,
    payment_method: (isCreateOpen || isEditOpen) ? paymentMethod : undefined,
    reference_type: isCreateOpen ? "librarycard" : isEditOpen ? "deposittransaction" : undefined,
    invoice_no: (isCreateOpen || isEditOpen) ? generateRandomCode("INV") : undefined,
    receipt_no: (isCreateOpen || isEditOpen) ? generateRandomCode("RCPT") : undefined,
    amount: isEditOpen? depositFee - oldDepositPackageAmount : cardFee + depositFee,
  };

  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/reader/save`,
      body
    );

    if (response.data.success) {
      toast({
        title: isEditOpen ? "Cập nhật thành công" : "Thêm độc giả thành công",
        variant: "success",
      });

      onSuccess?.();
      setIsSaving(false);
      closeCreate();
    } else {
      throw new Error("Lưu độc giả thất bại.");
    }
  } catch (err: any) {
    const errorMessage =
      err?.response?.data?.error || err?.message || "Có lỗi xảy ra khi gửi dữ liệu.";
    toast({
      title: "Lỗi từ hệ thống",
      description: errorMessage,
      variant: "destructive",
    });
    console.error("Lỗi khi gửi dữ liệu:", errorMessage);
    setIsSaving(false);
  }
};

  const selectedPackage = depositPackages.find(
    (p) => p.id.toString() === formData.deposit_package_id
  );
  const depositFee = selectedPackage?.amount || 0;

  return (
    <Dialog open={isCreateOpen || isEditOpen} onOpenChange={closeCreate}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-primary">
            {isCreateOpen ? "Thêm độc giả" : "Chỉnh sửa độc giả"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex gap-4">
            <div className="flex flex-col flex-1">
              <Label className="mb-2">Họ độc giả</Label>
              <Input
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Họ"
              />
            </div>
            <div className="col-span-2 flex gap-4">
              <div className="flex flex-col flex-1">
                <Label className="mb-2">Tên độc giả</Label>
                <Input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Tên"
                />
              </div>
            </div>
          </div>

          <div className="col-span-2 flex gap-4">
            <div className="flex flex-col flex-1">
              <Label className="mb-2">Ngày sinh</Label>
              <Input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
              />
            </div>
            <div className="flex flex-col flex-1">
              <Label className="mb-2">Giới tính</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, gender: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn giới tính" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Nam</SelectItem>
                  <SelectItem value="F">Nữ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="col-span-2 flex gap-4">
            <div className="flex flex-col flex-1">
              <Label className="mb-2">Email</Label>
              <Input
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                type="email"
              />
            </div>
            <div className="col-span-2 flex gap-4">
              <div className="flex flex-col flex-1">
                <Label className="mb-2">Số điện thoại</Label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Số điện thoại"
                />
              </div>
            </div>
          </div>

          <div className="col-span-2 flex gap-4">
            <div className="flex flex-col flex-1">
              <Label className="mb-2">Địa chỉ</Label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Địa chỉ"
              />
            </div>
            <div className="flex flex-col flex-1">
              <Label className="mb-2">Loại thẻ</Label>
              <Select
                value={formData.card_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, card_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại thẻ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mượn">Thẻ mượn</SelectItem>
                  <SelectItem value="Đọc">Thẻ đọc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="col-span-2 flex gap-4">
            <div className="flex flex-col flex-1">
              <Label className="mb-2">Gói đặt cọc</Label>
              <Select
                value={formData.deposit_package_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    deposit_package_id: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn gói đặt cọc" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    0 ₫
                  </SelectItem>
                  {depositPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id.toString()}>
                      {pkg.amount.toLocaleString("vi-VN")}₫
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col flex-1">
              <Label className="mb-2">Ảnh thẻ</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setImageFile(e.target.files?.[0] || null)
                }
              />
              {formData.photo_url && !imageFile && (
                <img
                  src={formData.photo_url}
                  alt="Ảnh cũ"
                  className="mt-2 h-24 w-24 rounded object-cover"
                />
              )}
            </div>
          </div>
        </div>

        {(isCreateOpen || isEditOpen) && (
        <div className="mt-6 space-y-4">
          <PaymentCardModel
            cardFee={cardFee}
            depositFee={depositFee}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            oldDepositAmount={oldDepositPackageAmount}
            isEdit={isEditOpen}
            fullName={`${formData.last_name} ${formData.first_name}`}
          />
        </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={closeCreate}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving
              ? "Đang lưu..."
              : isEditOpen
              ? "Cập nhật"
              : "Lưu độc giả"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReaderFormModal;
