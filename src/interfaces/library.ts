export interface Author {
  author_id: number;
  author_name: string;
}

export interface BookTitle {
  book_title_id: number;
  title: string;
}

export interface Condition {
  condition_id: number;
  condition_name: string;
}

export interface BookCopy {
  copy_id: number;
  booktitle: BookTitle;
  condition: Condition;
}

export interface LoanDetail {
  loan_detail_id: number;
  return_date: string | null;
  renewal_count: number;
  bookcopy: BookCopy;
}

export interface Reader {
  reader_id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface LibraryCard {
  card_id: number;
  card_number: string;
  reader: Reader;
}

export interface Staff {
  staff_id: number;
  first_name: string;
  last_name: string;
}

export interface LoanTransactionData {
  loan_transaction_id: number;
  transaction_date: string;
  due_date: string;
  loan_status: string;
  borrow_type: string;
  staff: Staff;
  librarycard: LibraryCard;
  loandetail: LoanDetail[];
}

export interface ReservationData {
  reservation_id: number;
  reservation_date: string;
  expiration_date: string;
  reservation_status: string;
  booktitle: BookTitle;
  librarycard: LibraryCard;
}

export interface FormattedBook {
  id: number;
  title: string;
  author: string;
  condition: string;
  returnDate: string | null;
}

export interface FormattedReader {
  id: number;
  cardNumber: string;
  name: string;
  email?: string;
}

export interface FormattedLoanTransaction {
  id: number;
  reader: FormattedReader;
  transactionDate: string;
  dueDate: string;
  status: string;
  borrowType: string;
  books: FormattedBook[];
  staffName: string;
}

export interface FormattedReservation {
  id: number;
  reader: FormattedReader;
  bookTitle: string;
  author: string;
  reservationDate: string;
  expirationDate: string;
  status: string;
}

export interface LoanManagementTabProps {
  loanTransactions: FormattedLoanTransaction[];
  onLoanCreated: () => void;
  onLoanStatusChanged: () => void;
}

export interface ReservationsTabProps {
  reservations: FormattedReservation[];
}
