"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  BookReturnStatus,
  Condition,
  ReturnBookDialogProps,
} from "@/interfaces/ReturnBook";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ArrowLeft } from "lucide-react";
import { SelectBooksStep } from "./SelectBooksStep";
import { ReviewFeesStep } from "./ReviewFeesStep";
import { PaymentStep } from "./PaymentStep";
import { SuccessStep } from "./SuccessStep";

export const ReturnBookDialog: React.FC<ReturnBookDialogProps> = ({
  selectedLoan,
  dialogOpen,
  setDialogOpen,
  closeDialog,
  onReturnComplete,
  returnToLoanDetails,
}) => {
  const [step, setStep] = useState(1);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [lateFeeRate, setLateFeeRate] = useState<number>(0);
  const [booksStatus, setBooksStatus] = useState<BookReturnStatus[]>([]);
  const [allSelected, setAllSelected] = useState(true);
  const [totalFine, setTotalFine] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptNo, setReceiptNo] = useState("");
  const paymentMethod = "Tiền mặt";

  useEffect(() => {
    if (dialogOpen && selectedLoan) {
      initializeData();
    }
  }, [dialogOpen, selectedLoan]);

  useEffect(() => {
    calculateTotalFine();
  }, [booksStatus]);

  useEffect(() => {
    updateAllBooksSelection();
  }, [booksStatus]);

  const initializeData = async () => {
    await Promise.all([fetchConditions(), fetchLateFeeRate()]);

    // Initialize books status after fetching late fee rate
    await initializeBooksStatus();

    setStep(1);
    setAllSelected(true);
  };

  const fetchConditions = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/loan-transactions/return-book/conditions`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }
      console.log("Conditions:", result.data);
      setConditions(result.data || []);
    } catch (error) {
      console.error("Error fetching conditions:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu tình trạng sách",
        variant: "destructive",
      });
    }
  };

  const fetchLateFeeRate = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/loan-transactions/return-book/late-fee-rate`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setLateFeeRate(result.data);
      return result.data; // Return the rate for immediate use
    } catch (error) {
      console.error("Error fetching late fee rate:", error);
      return 0;
    }
  };

  const calculateLateFee = (dueDate: string, feeRate: number): number => {
    const today = new Date();
    const due = new Date(dueDate);

    if (today > due) {
      const daysLate = Math.ceil(
        (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysLate * feeRate;
    }
    return 0;
  };

  const initializeBooksStatus = async () => {
    if (!selectedLoan || !selectedLoan.books) return;

    const unreturned = selectedLoan.books.filter((book) => !book.returnDate);

    if (unreturned.length === 0) {
      toast({
        title: "Thông báo",
        description: "Tất cả sách trong mượn này đã được trả",
        variant: "default",
      });
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/loan-transactions/return-book/book-details`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            loanId: selectedLoan.id,
            books: unreturned,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      let currentLateFeeRate = lateFeeRate;
      if (currentLateFeeRate === 0) {
        currentLateFeeRate = await fetchLateFeeRate();
      }

      const booksWithLateFee = result.data.map((bookDetail: any) => {
        const lateFee = calculateLateFee(
          selectedLoan.dueDate,
          currentLateFeeRate,
        );

        return {
          ...bookDetail,
          isSelected: true,
          newCondition: bookDetail.book.condition_id,
          isLost: false,
          lateFee: lateFee,
          damageFee: 0,
          availabilityStatus: "Có sẵn",
        };
      });

      setBooksStatus(booksWithLateFee);

      setTimeout(() => {
        calculateTotalFineFromBooks(booksWithLateFee);
      }, 0);

      if (booksWithLateFee.length === 0) {
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin sách cho mượn",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching book details:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin sách cho mượn",
        variant: "destructive",
      });
    }
  };

  const calculateTotalFine = () => {
    calculateTotalFineFromBooks(booksStatus);
  };

  const calculateTotalFineFromBooks = (books: BookReturnStatus[]) => {
    let total = 0;
    books.forEach((bookStatus) => {
      if (bookStatus.isSelected) {
        total += bookStatus.lateFee || 0;
        total += bookStatus.damageFee || 0;
      }
    });
    setTotalFine(total);
  };

  const updateAllBooksSelection = () => {
    const allBooksSelected = booksStatus.every((book) => book.isSelected);
    setAllSelected(allBooksSelected);
  };

  const handleToggleSelectAll = () => {
    const newValue = !allSelected;
    setAllSelected(newValue);
    setBooksStatus((prevStatus) =>
      prevStatus.map((status) => ({
        ...status,
        isSelected: newValue,
      })),
    );
  };

  const handleToggleSelect = (index: number) => {
    setBooksStatus((prevStatus) => {
      const newStatus = [...prevStatus];
      newStatus[index] = {
        ...newStatus[index],
        isSelected: !newStatus[index].isSelected,
      };
      return newStatus;
    });
  };

  const handleConditionChange = (index: number, value: string) => {
    const conditionId = parseInt(value);
    const bookStatus = booksStatus[index];

    if (conditionId < bookStatus.book.condition_id) {
      toast({
        title: "Lỗi",
        description:
          "Không thể cập nhật tình trạng sách tốt hơn tình trạng hiện tại",
        variant: "destructive",
      });
      return;
    }

    const isDamaged = conditionId === 3;
    const damageFee = isDamaged ? bookStatus.book.price * 0.5 : 0;

    setBooksStatus((prevStatus) => {
      const newStatus = [...prevStatus];
      newStatus[index] = {
        ...newStatus[index],
        newCondition: conditionId,
        damageFee: newStatus[index].isLost
          ? newStatus[index].damageFee
          : damageFee,
      };
      return newStatus;
    });
  };

  const handleAvailabilityStatusChange = (index: number, value: string) => {
    const bookStatus = booksStatus[index];
    const isLost = value === "Thất lạc";

    let damageFee = 0;
    if (isLost) {
      damageFee = bookStatus.book.price;
    } else if (bookStatus.newCondition === 3) {
      damageFee = bookStatus.book.price * 0.5;
    }

    setBooksStatus((prevStatus) => {
      const newStatus = [...prevStatus];
      newStatus[index] = {
        ...newStatus[index],
        availabilityStatus: value,
        isLost,
        damageFee,
      };
      return newStatus;
    });
  };

  const handleNextStep = () => {
    if (step === 1) {
      const selectedBooks = booksStatus.filter((status) => status.isSelected);
      if (selectedBooks.length === 0) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn ít nhất một cuốn sách để trả",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      returnToLoanDetails();
    }
  };

  const handleSubmit = async () => {
    if (!selectedLoan) return;

    setIsProcessing(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/loan-transactions/return-book/process`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            loanId: selectedLoan.id,
            readerId: selectedLoan.reader.id,
            booksStatus,
            totalFine,
            paymentMethod,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setReceiptNo(result.receiptNumber);
      setStep(4);
    } catch (error) {
      console.error("Error processing return:", error);
      toast({
        title: "Lỗi",
        description: "Không thể hoàn tất quá trình trả sách. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = () => {
    closeDialog();
    onReturnComplete();
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Trả sách - Chọn sách và cập nhật tình trạng";
      case 2:
        return "Trả sách - Xác nhận thông tin chi phí";
      case 3:
        return "Trả sách - Xác nhận thanh toán";
      case 4:
        return "Trả sách - Hoàn tất";
      default:
        return "Trả sách";
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-4xl">
        {selectedLoan && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousStep}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {getStepTitle()}
              </DialogTitle>
              <DialogDescription>
                ID Giao dịch: {selectedLoan.id} | Độc giả:{" "}
                {selectedLoan.reader.name}
              </DialogDescription>
            </DialogHeader>

            {step === 1 && (
              <SelectBooksStep
                booksStatus={booksStatus}
                conditions={conditions}
                allSelected={allSelected}
                handleToggleSelectAll={handleToggleSelectAll}
                handleToggleSelect={handleToggleSelect}
                handleConditionChange={handleConditionChange}
                handleAvailabilityStatusChange={handleAvailabilityStatusChange}
              />
            )}

            {step === 2 && (
              <ReviewFeesStep booksStatus={booksStatus} totalFine={totalFine} />
            )}

            {step === 3 && (
              <PaymentStep
                totalFine={totalFine}
                fullName={selectedLoan.reader.name}
                booksStatus={booksStatus}
              />
            )}
            {step === 4 && (
              <SuccessStep
                totalFine={totalFine}
                receiptNo={receiptNo}
              />
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {step === 1 && (
                <>
                  <Button variant="outline" onClick={returnToLoanDetails}>
                    Huỷ
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={booksStatus.length === 0}
                  >
                    Tiếp tục
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <Button variant="outline" onClick={handlePreviousStep}>
                    Quay lại
                  </Button>
                  <Button onClick={handleNextStep}>Tiếp tục</Button>
                </>
              )}

              {step === 3 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={isProcessing}
                  >
                    Quay lại
                  </Button>
                  <Button onClick={handleSubmit} disabled={isProcessing}>
                    {isProcessing ? "Đang xử lý..." : "Xác nhận trả sách"}
                  </Button>
                </>
              )}

              {step === 4 && <Button onClick={handleComplete}>Hoàn tất</Button>}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
