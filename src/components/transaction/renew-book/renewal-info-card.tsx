"use client";

import React from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RenewalInfoCardProps {
  currentDueDate: string;
  unreturnedBookCount: number;
  currentRenewalCount: number;
  maxRenewals: number;
  renewalDays: number;
  newDueDate: string | null;
  canRenew: boolean;
}

export const RenewalInfoCard: React.FC<RenewalInfoCardProps> = ({
  currentDueDate,
  unreturnedBookCount,
  currentRenewalCount,
  maxRenewals,
  renewalDays,
  newDueDate,
  canRenew,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Clock className="mr-2 h-4 w-4" />
          Thông tin gia hạn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Hạn trả hiện tại:</span>
          <span className="font-medium">{currentDueDate}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Số lượng sách chưa trả:</span>
          <span className="font-medium">{unreturnedBookCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Số lần đã gia hạn:</span>
          <span className="font-medium">{currentRenewalCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Giới hạn gia hạn:</span>
          <span className="font-medium">{maxRenewals} lần</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Thời gian gia hạn:</span>
          <span className="font-medium">{renewalDays} ngày</span>
        </div>
        {canRenew && newDueDate && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Hạn trả mới:</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {newDueDate}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
