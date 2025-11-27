"use client";

import React from "react";
import { FormattedLoanTransaction } from "@/interfaces/library";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Book, Home, BookOpen } from "lucide-react";

interface LoanTableProps {
  currentItems: FormattedLoanTransaction[];
  handleRowClick: (loan: FormattedLoanTransaction) => void;
}

export const LoanTable: React.FC<LoanTableProps> = ({
  currentItems,
  handleRowClick,
}) => {
  const getBorrowTypeIcon = (borrowType: string) => {
    return borrowType === "Mượn về" ? (
      <Home className="mr-2 h-4 w-4 text-muted-foreground" />
    ) : (
      <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã thẻ</TableHead>
          <TableHead>Tên độc giả</TableHead>
          <TableHead>Ngày mượn</TableHead>
          <TableHead>Hạn trả</TableHead>
          <TableHead>Số sách mượn</TableHead>
          <TableHead>Loại mượn</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {currentItems.map((loan) => (
          <TableRow
            key={loan.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => handleRowClick(loan)}
          >
            <TableCell className="font-medium">
              {loan.reader.cardNumber}
            </TableCell>
            <TableCell>{loan.reader.name}</TableCell>
            <TableCell>{loan.transactionDate}</TableCell>
            <TableCell>{loan.dueDate}</TableCell>
            <TableCell>
              <div className="flex items-center">
                <Book className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{loan.books.length} cuốn</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center">
                {getBorrowTypeIcon(loan.borrowType)}
                <span>{loan.borrowType}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  loan.status === "Đang mượn"
                    ? "default"
                    : loan.status === "Quá hạn"
                      ? "destructive"
                      : "secondary"
                }
              >
                {loan.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
