"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/client";
import {
  Bars3Icon,
  XMarkIcon,
  CreditCardIcon,
  QueueListIcon,
  CalendarDateRangeIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/solid";

import ReaderFormModal from "@/components/ReaderFormModal";
import ReaderDetailModal from "@/components/ReaderDetailModel";
import CardDetailModal from "@/components/CardDetailModel";
import ExtendCardModal from "@/components/ExtendCardModel";
import CancelCardModel from "@/components/CancelCardModel";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const cardStatuses = ["Tất cả", "Hoạt động", "Chưa gia hạn", "Đã hủy"];
const readersPerPage = 6;

const ReadersPage = () => {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [cardStatus, setCardStatus] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [modals, setModals] = useState({
    detail: false,
    card: false,
    extend: false,
    create: false,
    edit: false,
    cancel: false,
  });

  const [readers, setReaders] = useState<any[]>([]);
  const [selectedReader, setSelectedReader] = useState<any | null>(null);
  const [extendMonths, setExtendMonths] = useState(3);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = supabaseClient();

      const { data: settingData, error: settingError } = await supabase
        .from("systemsetting")
        .select("setting_value")
        .eq("setting_id", 4)
        .single();

      if (!settingError && settingData?.setting_value) {
        setExtendMonths(parseInt(settingData.setting_value));
      }

      const { data: readerData, error: readerError } = await supabase.from(
        "reader",
      ).select(`
          *,
          librarycard (
            *,
            depositpackage (*),
            reservation(*),
            loantransaction(*)
          )
        `);

      if (!readerError) {
        setReaders(readerData || []);
      } else {
        console.error("Lỗi khi lấy độc giả:", readerError);
      }
    };

    fetchData();
  }, [refreshTrigger]);

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    toast({
      title: "Thành công",
      description: "Dữ liệu đã được cập nhật thành công.",
      variant: "success",
    });
  };

  const filteredReaders = readers.filter((r) => {
    const card = r.librarycard?.[0];
    const fullName = `${r.first_name} ${r.last_name}`.toLowerCase();
    const matchName = fullName.includes(searchTerm.toLowerCase());

    const status = card?.card_status || "Chưa đăng ký";

    const matchStatus =
      cardStatus === "Tất cả" ||
      (cardStatus === "Hoạt động" && status === "Hoạt động") ||
      (cardStatus === "Chưa gia hạn" && status === "Chưa gia hạn") ||
      (cardStatus === "Đã hủy" && status === "Đã hủy");

    return matchName && matchStatus;
  });

  const totalPages = Math.ceil(filteredReaders.length / readersPerPage);
  const paginatedReaders = filteredReaders.slice(
    (currentPage - 1) * readersPerPage,
    currentPage * readersPerPage,
  );

  const openModal = (type: keyof typeof modals, reader?: any) => {
    setModals({
      detail: false,
      card: false,
      extend: false,
      create: false,
      edit: false,
      cancel: false,
      [type]: true,
    });
    setSelectedReader(reader || null);
  };

  const closeModals = () => {
    setModals({
      detail: false,
      card: false,
      extend: false,
      create: false,
      edit: false,
      cancel: false,
    });
  };

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tên..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="min-w-[150px] py-6"
          />
          <Select
            value={cardStatus}
            onValueChange={(val) => {
              setCardStatus(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="min-w-[150px] py-6">
              <SelectValue placeholder="Trạng thái thẻ" />
            </SelectTrigger>
            <SelectContent>
              {cardStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden space-x-2 md:flex">
          <FilterButton
            icon={<CreditCardIcon className="icon me-1 text-[#0071BC]" />}
            label="Tạo thẻ"
            onClick={() => openModal("create")}
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="flex w-full justify-start p-4 md:hidden"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-5 w-5" />
          ) : (
            <Bars3Icon className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mt-4 flex w-full flex-col space-y-4 md:hidden">
          <FilterButton
            icon={<CreditCardIcon className="icon me-1 text-[#0071BC]" />}
            label="Tạo thẻ"
            onClick={() => openModal("create")}
          />
        </div>
      )}

      {/* Readers */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {paginatedReaders.map((reader, i) => {
          const card = reader.librarycard?.[0];
          const status = card?.card_status || "Chưa đăng ký";

          return (
            <div
              key={i}
              className="cursor-pointer rounded-lg border p-4 shadow-sm hover:shadow-md"
              onClick={() => openModal("detail", reader)}
            >
              <img
                src={reader.photo_url}
                alt="avatar"
                className="mx-auto h-32 w-32 rounded-full object-cover"
              />
              <h3 className="mt-4 text-center font-semibold">
                {reader.last_name} {reader.first_name}
              </h3>
              <p className="text-center text-sm text-gray-600">
                {card?.card_type || "Chưa đăng ký"}
              </p>
              <p className="mt-1 text-center text-sm text-gray-500">
                Hạn mức: {card?.depositpackage?.package_amount || 0} VND
              </p>

              <p
                className={`text-center text-sm font-semibold ${
                  status === "Đã hủy"
                    ? "text-gray-500"
                    : status === "Chưa gia hạn"
                      ? "text-red-600"
                      : "text-green-600"
                }`}
              >
                Tình trạng: {status}
              </p>
              <p className="mt-2 text-center text-sm text-gray-700">
                {reader.address}
              </p>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center space-x-2">
          <PageButton
            label="Trước"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          />
          {[...Array(totalPages)].map((_, idx) => (
            <PageButton
              key={idx}
              label={(idx + 1).toString()}
              onClick={() => setCurrentPage(idx + 1)}
              active={currentPage === idx + 1}
            />
          ))}
          <PageButton
            label="Tiếp"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          />
        </div>
      )}

      {/* Modals */}

      <CancelCardModel
        isOpen={modals.cancel}
        onClose={closeModals}
        reader={selectedReader}
        onSuccess={handleSuccess}
        fullName={`${selectedReader?.last_name || ""} ${selectedReader?.first_name || ""}`}
      />

      <ExtendCardModal
        isOpen={modals.extend}
        onClose={closeModals}
        readerId={selectedReader?.reader_id}
        onSuccess={handleSuccess}
        fullName={`${selectedReader?.last_name || ""} ${selectedReader?.first_name || ""}`}
      />

      <CardDetailModal
        isOpen={modals.card}
        onClose={closeModals}
        onExtend={(reader) => openModal("extend", reader)}
        onCancel={(reader) => openModal("cancel", reader)}
        reader={selectedReader}
        extendMonths={extendMonths}
      />

      <ReaderDetailModal
        isOpen={modals.detail}
        onClose={closeModals}
        onEdit={() => openModal("edit", selectedReader)}
        onCard={() => openModal("card", selectedReader)}
        reader={selectedReader}
        onSuccess={handleSuccess}
      />

      <ReaderFormModal
        isCreateOpen={modals.create}
        isEditOpen={modals.edit}
        closeCreate={closeModals}
        reader={selectedReader}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

// Buttons
const FilterButton = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) => (
  <Button
    variant="outline"
    className="flex w-full justify-start space-x-2"
    onClick={onClick}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </Button>
);

const PageButton = ({
  label,
  onClick,
  disabled,
  active,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`rounded border px-3 py-1 text-sm ${active ? "bg-[#0071BC] text-white" : "hover:bg-gray-400"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
  >
    {label}
  </button>
);

export default ReadersPage;
