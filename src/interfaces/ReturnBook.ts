import { FormattedLoanTransaction } from "./library";

// Define Condition type matching your database
export interface Condition {
  condition_id: number;
  condition_name: string;
  description: string | null;
}

// Define Fine type
export interface Fine {
  bookId: number;
  bookTitle: string;
  fineType: string;
  amount: number;
}

export interface BookReturnStatus {
  book: {
    id: number;
    title: string;
    author: string;
    condition: string;
    condition_id: number;
    price: number;
    copy_id: number;
    loan_detail_id: number;
  };
  availabilityStatus?: string;
  isSelected: boolean;
  newCondition: number | null;
  isLost: boolean;
  lateFee: number;
  damageFee: number;
}

export interface ReturnBookDialogProps {
  selectedLoan: FormattedLoanTransaction | null;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  closeDialog: () => void;
  onReturnComplete: () => void;
  returnToLoanDetails: () => void;
}
