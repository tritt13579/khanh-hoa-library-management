"use client";

import React, { useState } from "react";
import { CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AddLoanDialog from "../addloan/AddLoanDialog";
interface LoanManagementHeaderProps {
  onLoanCreated: () => void;
}

export const LoanManagementHeader = ({
  onLoanCreated,
}: LoanManagementHeaderProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <CardHeader className="flex flex-row items-center justify-between">
      <div>
        <CardTitle>Giao dịch mượn/trả sách</CardTitle>
        <CardDescription>
          Quản lý các giao dịch mượn/trả sách đang hoạt động
        </CardDescription>
      </div>

      <div className="flex space-x-2">
        <Button
          className="flex items-center"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Giao dịch mượn mới
        </Button>

        <AddLoanDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onLoanCreated={onLoanCreated}
        />
      </div>
    </CardHeader>
  );
};
