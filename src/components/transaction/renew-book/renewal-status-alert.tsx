"use client";

import React from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RenewalStatusAlertProps {
  canRenew: boolean;
  renewalErrorMessage: string;
  unreturnedBookCount: number;
  renewalDays: number;
}

export const RenewalStatusAlert: React.FC<RenewalStatusAlertProps> = ({
  canRenew,
  renewalErrorMessage,
  unreturnedBookCount,
  renewalDays,
}) => {
  if (!canRenew && renewalErrorMessage) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Không thể gia hạn</AlertTitle>
        <AlertDescription>{renewalErrorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (canRenew) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-600 dark:bg-green-900">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-300" />
        <AlertTitle className="text-green-700 dark:text-green-200">
          Sẵn sàng gia hạn
        </AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-300">
          Bạn có thể gia hạn thêm {renewalDays} ngày cho {unreturnedBookCount}{" "}
          sách chưa trả.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
