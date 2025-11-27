"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarRange, RefreshCw } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";

interface RenewBookActionsProps {
  canRenew: boolean;
  isLoading: boolean;
  onRenew: () => Promise<void>;
  onReturn: () => void;
}

export const RenewBookActions: React.FC<RenewBookActionsProps> = ({
  canRenew,
  isLoading,
  onRenew,
  onReturn,
}) => {
  return (
    <DialogFooter className="gap-2 sm:gap-0">
      <Button
        variant="default"
        onClick={onRenew}
        disabled={!canRenew || isLoading}
        className="flex-1"
      >
        {isLoading ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CalendarRange className="mr-2 h-4 w-4" />
        )}
        Gia hạn sách
      </Button>
      <Button variant="secondary" onClick={onReturn} className="flex-1">
        <Calendar className="mr-2 h-4 w-4" />
        Quay lại
      </Button>
    </DialogFooter>
  );
};
