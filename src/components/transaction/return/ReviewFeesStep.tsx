"use client";

import React from "react";
import { BookReturnStatus } from "@/interfaces/ReturnBook";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReviewFeesStepProps {
  booksStatus: BookReturnStatus[];
  totalFine: number;
}

export const ReviewFeesStep: React.FC<ReviewFeesStepProps> = ({
  booksStatus,
  totalFine,
}) => {
  const selectedBooks = booksStatus.filter((status) => status.isSelected);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết phí phạt</CardTitle>
          <CardDescription>
            Các khoản phí phạt phát sinh trong quá trình trả sách
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên sách</TableHead>
                <TableHead>Loại phí</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedBooks.map((status, index) => (
                <React.Fragment key={index}>
                  {status.lateFee > 0 && (
                    <TableRow>
                      <TableCell>{status.book.title}</TableCell>
                      <TableCell>Phí trả trễ</TableCell>
                      <TableCell className="text-right">
                        {status.lateFee.toLocaleString("vi-VN")} VNĐ
                      </TableCell>
                    </TableRow>
                  )}
                  {status.damageFee > 0 && (
                    <TableRow>
                      <TableCell>{status.book.title}</TableCell>
                      <TableCell>
                        {status.availabilityStatus === "Thất lạc"
                          ? "Phí thất lạc"
                          : "Phí hư hại"}
                      </TableCell>
                      <TableCell className="text-right">
                        {status.damageFee.toLocaleString("vi-VN")} VNĐ
                      </TableCell>
                    </TableRow>
                  )}
                  {status.lateFee === 0 && status.damageFee === 0 && (
                    <TableRow>
                      <TableCell>{status.book.title}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right">0 VNĐ</TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="font-medium">Tổng tiền phạt:</div>
          <div className="text-lg font-bold">
            {totalFine.toLocaleString("vi-VN")} VNĐ
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
