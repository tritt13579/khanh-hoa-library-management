export interface RenewalSettings {
  maxRenewals: number;
  renewalDays: number;
}

export interface RenewalCountResponse {
  currentRenewalCount: number;
  unreturnedBookCount: number;
  unreturnedBooks: {
    renewal_count: number;
    return_date: string | null;
  }[];
}

export interface RenewBooksRequest {
  currentRenewalCount: number;
  renewalDays: number;
  dueDate: string;
}

export interface RenewBooksResponse {
  success: boolean;
  newDueDate: string;
}
