"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Search, Filter, BookOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LoanFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  filterBorrowType: string;
  setFilterBorrowType: (value: string) => void;
}

export const LoanFilters: React.FC<LoanFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterBorrowType,
  setFilterBorrowType,
}) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex w-full items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên độc giả, mã thẻ hoặc tên sách..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Lọc trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="Đang mượn">Đang mượn</SelectItem>
            <SelectItem value="Quá hạn">Quá hạn</SelectItem>
            <SelectItem value="Đã trả">Đã trả</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterBorrowType} onValueChange={setFilterBorrowType}>
          <SelectTrigger className="w-[180px]">
            <BookOpen className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Loại mượn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại mượn</SelectItem>
            <SelectItem value="Mượn về">Mượn về</SelectItem>
            <SelectItem value="Đọc tại chỗ">Đọc tại chỗ</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
