"use client";

import React, { useState } from "react";
import { FormattedLoanTransaction } from "@/interfaces/library";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  User,
  Calendar,
  Book,
  Clock,
  CheckCircle2,
  History,
  Home,
  BookOpen,
} from "lucide-react";

import { ReturnBookDialog } from "../return/ReturnBookDialog";
import { RenewBookDialog } from "../renew-book/renew-book-dialog";

interface LoanDetailsDialogProps {
  selectedLoan: FormattedLoanTransaction | null;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  closeDialog: () => void;
  onLoanStatusChanged?: () => void;
}

export const LoanDetailsDialog: React.FC<LoanDetailsDialogProps> = ({
  selectedLoan,
  dialogOpen,
  setDialogOpen,
  closeDialog,
  onLoanStatusChanged,
}) => {
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);

  const getBorrowTypeIcon = (borrowType: string) => {
    return borrowType === "Mượn về" ? (
      <Home className="mr-2 h-4 w-4 text-muted-foreground" />
    ) : (
      <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
    );
  };

  const handleReturnDialogOpen = () => {
    setReturnDialogOpen(true);
  };

  const handleRenewDialogOpen = () => {
    setRenewDialogOpen(true);
  };

  const handleLoanStatusChanged = () => {
    if (onLoanStatusChanged) {
      onLoanStatusChanged();
    }
    closeDialog();
  };

  return (
    <>
      <Dialog
        open={dialogOpen && !returnDialogOpen && !renewDialogOpen}
        onOpenChange={setDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          {selectedLoan && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Chi tiết giao dịch mượn sách
                </DialogTitle>
                <DialogDescription>
                  ID Giao dịch: {selectedLoan.id}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="flex items-center font-medium">
                      <User className="mr-2 h-4 w-4" />
                      Thông tin độc giả
                    </h3>
                    <div className="space-y-1 pl-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mã thẻ:</span>
                        <span className="font-medium">
                          {selectedLoan.reader.cardNumber}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Họ tên:</span>
                        <span>{selectedLoan.reader.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Email:</span>
                        <span>{selectedLoan.reader.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="flex items-center font-medium">
                      <Calendar className="mr-2 h-4 w-4" />
                      Thông tin giao dịch
                    </h3>
                    <div className="space-y-1 pl-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Ngày mượn:
                        </span>
                        <span>{selectedLoan.transactionDate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hạn trả:</span>
                        <span>{selectedLoan.dueDate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Loại mượn:
                        </span>
                        <div className="flex items-center">
                          {getBorrowTypeIcon(selectedLoan.borrowType)}
                          <span>{selectedLoan.borrowType}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Nhân viên:
                        </span>
                        <span>{selectedLoan.staffName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Trạng thái:
                        </span>
                        <Badge
                          variant={
                            selectedLoan.status === "Đang mượn"
                              ? "default"
                              : selectedLoan.status === "Quá hạn"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {selectedLoan.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="space-y-2">
                    <h3 className="flex items-center font-medium">
                      <Book className="mr-2 h-4 w-4" />
                      Danh sách sách mượn
                    </h3>
                    <div className="space-y-3 pl-6">
                      {selectedLoan.books.map((book, idx) => (
                        <div
                          key={idx}
                          className="space-y-1 rounded-md border p-3"
                        >
                          <div className="font-medium">{book.title}</div>
                          <div className="text-sm text-muted-foreground">
                            Tác giả: {book.author}
                          </div>
                          <div className="text-sm">
                            <span className="mr-2 text-muted-foreground">
                              Tình trạng:
                            </span>
                            <span>{book.condition}</span>
                          </div>
                          {book.returnDate && (
                            <div className="text-sm">
                              <span className="mr-2 text-muted-foreground">
                                Ngày trả:
                              </span>
                              <span>{book.returnDate}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {selectedLoan.status !== "Đã trả" && (
                  <>
                    {selectedLoan.status !== "Quá hạn" && (
                      <Button variant="outline" onClick={handleRenewDialogOpen}>
                        <Clock className="mr-2 h-4 w-4" />
                        Gia hạn mượn
                      </Button>
                    )}
                    <Button variant="default" onClick={handleReturnDialogOpen}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Trả sách
                    </Button>
                  </>
                )}
                <Button variant="secondary" onClick={closeDialog}>
                  Đóng
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Return Book Dialog */}
      {selectedLoan && (
        <ReturnBookDialog
          selectedLoan={selectedLoan}
          dialogOpen={returnDialogOpen}
          setDialogOpen={setReturnDialogOpen}
          closeDialog={() => setReturnDialogOpen(false)}
          onReturnComplete={handleLoanStatusChanged}
          returnToLoanDetails={() => setReturnDialogOpen(false)}
        />
      )}

      {/* Renew Book Dialog */}
      {selectedLoan && (
        <RenewBookDialog
          selectedLoan={selectedLoan}
          dialogOpen={renewDialogOpen}
          setDialogOpen={setRenewDialogOpen}
          closeDialog={() => setRenewDialogOpen(false)}
          onRenewComplete={handleLoanStatusChanged}
          returnToLoanDetails={() => setRenewDialogOpen(false)}
        />
      )}
    </>
  );
};
