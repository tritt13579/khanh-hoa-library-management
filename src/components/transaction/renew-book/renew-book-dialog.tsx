"use client";

import React, { useState, useEffect } from "react";
import { FormattedLoanTransaction } from "@/interfaces/library";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { RenewalInfoCard } from "./renewal-info-card";
import { RenewalStatusAlert } from "./renewal-status-alert";
import { RenewBookActions } from "./renew-book-actions";
import {
  fetchRenewalSettings,
  checkRenewalEligibility,
  renewBooks,
} from "@/lib/renewal-service";

interface RenewBookDialogProps {
  selectedLoan: FormattedLoanTransaction | null;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  closeDialog: () => void;
  onRenewComplete?: () => void;
  returnToLoanDetails: () => void;
}

export function RenewBookDialog({
  selectedLoan,
  dialogOpen,
  setDialogOpen,
  closeDialog,
  onRenewComplete,
  returnToLoanDetails,
}: RenewBookDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [renewalSettings, setRenewalSettings] = useState({
    maxRenewals: 2,
    renewalDays: 20,
  });
  const [currentRenewalCount, setCurrentRenewalCount] = useState(0);
  const [canRenew, setCanRenew] = useState(true);
  const [renewalErrorMessage, setRenewalErrorMessage] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [unreturnedBookCount, setUnreturnedBookCount] = useState(0);

  useEffect(() => {
    if (dialogOpen && selectedLoan) {
      loadRenewalData();
    }
  }, [dialogOpen, selectedLoan]);

  const loadRenewalData = async () => {
    if (!selectedLoan) return;

    try {
      setIsLoading(true);

      // Fetch renewal settings
      const settings = await fetchRenewalSettings();
      setRenewalSettings(settings);

      // Check renewal eligibility
      const eligibility = await checkRenewalEligibility(selectedLoan, settings);

      setCurrentRenewalCount(eligibility.currentRenewalCount);
      setUnreturnedBookCount(eligibility.unreturnedBookCount);
      setCanRenew(eligibility.canRenew);
      setRenewalErrorMessage(eligibility.renewalErrorMessage);
      setNewDueDate(eligibility.newDueDate);
    } catch (error) {
      console.error("Error loading renewal data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenewBooks = async () => {
    if (!selectedLoan) return;

    try {
      setIsLoading(true);

      await renewBooks(
        selectedLoan,
        currentRenewalCount,
        renewalSettings,
        unreturnedBookCount,
      );

      if (onRenewComplete) {
        onRenewComplete();
      }

      closeDialog();
    } catch (error) {
      console.error("Error in renew books handler:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-md">
        {selectedLoan && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Gia hạn sách</DialogTitle>
              <DialogDescription>
                Mã thẻ: {selectedLoan.reader.cardNumber} -{" "}
                {selectedLoan.reader.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <RenewalInfoCard
                currentDueDate={selectedLoan.dueDate}
                unreturnedBookCount={unreturnedBookCount}
                currentRenewalCount={currentRenewalCount}
                maxRenewals={renewalSettings.maxRenewals}
                renewalDays={renewalSettings.renewalDays}
                newDueDate={canRenew ? newDueDate : null}
                canRenew={canRenew}
              />

              <RenewalStatusAlert
                canRenew={canRenew}
                renewalErrorMessage={renewalErrorMessage}
                unreturnedBookCount={unreturnedBookCount}
                renewalDays={renewalSettings.renewalDays}
              />
            </div>

            <RenewBookActions
              canRenew={canRenew}
              isLoading={isLoading}
              onRenew={handleRenewBooks}
              onReturn={returnToLoanDetails}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
