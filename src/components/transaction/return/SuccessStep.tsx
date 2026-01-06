"use client";

import React from "react";
import { CheckCircle2, Receipt } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SuccessStepProps {
  totalFine: number;
  receiptNo: string;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({
  totalFine,
  receiptNo,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center py-6">
        <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
        <h2 className="mb-2 text-2xl font-bold">Trả sách thành công!</h2>
        <p className="mb-4 text-center text-muted-foreground">
          Quá trình trả sách đã được hoàn tất.
        </p>

        {totalFine > 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="mr-2 h-5 w-5" />
                Thông tin thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số hoá đơn:</span>
                  <span>{receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền:</span>
                  <span className="font-bold">
                    {totalFine.toLocaleString("vi-VN")} VNĐ
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
