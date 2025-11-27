import { format, addDays } from "date-fns";
import { supabaseClient } from "@/lib/client";
import { toast } from "@/hooks/use-toast";
import { FormattedLoanTransaction } from "@/interfaces/library";

interface RenewalSettings {
  maxRenewals: number;
  renewalDays: number;
}

export async function fetchRenewalSettings(): Promise<RenewalSettings> {
  try {
    const supabase = supabaseClient();
    const { data: maxRenewalsData, error: maxRenewalsError } = await supabase
      .from("systemsetting")
      .select("setting_value")
      .eq("setting_name", "Số lần gia hạn")
      .single();

    const { data: renewalDaysData, error: renewalDaysError } = await supabase
      .from("systemsetting")
      .select("setting_value")
      .eq("setting_name", "Thời gian mượn")
      .single();

    if (maxRenewalsError || renewalDaysError) {
      console.error(
        "Error fetching renewal settings:",
        maxRenewalsError || renewalDaysError,
      );
      return { maxRenewals: 2, renewalDays: 20 };
    }

    return {
      maxRenewals: parseInt(maxRenewalsData?.setting_value || "2"),
      renewalDays: parseInt(renewalDaysData?.setting_value || "20"),
    };
  } catch (error) {
    console.error("Error fetching renewal settings:", error);
    return { maxRenewals: 2, renewalDays: 20 };
  }
}

export interface RenewalCheckResult {
  currentRenewalCount: number;
  unreturnedBookCount: number;
  canRenew: boolean;
  renewalErrorMessage: string;
  newDueDate: string;
}

export async function checkRenewalEligibility(
  loan: FormattedLoanTransaction,
  renewalSettings: RenewalSettings,
): Promise<RenewalCheckResult> {
  try {
    const supabase = supabaseClient();

    const { data: loanDetails, error } = await supabase
      .from("loandetail")
      .select("renewal_count, return_date")
      .eq("loan_transaction_id", loan.id);

    if (error) {
      console.error("Error fetching renewal count:", error);
      throw new Error("Không thể kiểm tra thông tin gia hạn");
    }

    const unreturnedBooks =
      loanDetails?.filter((book) => book.return_date === null) || [];
    const unreturnedBookCount = unreturnedBooks.length;

    if (unreturnedBooks.length === 0) {
      return {
        currentRenewalCount: 0,
        unreturnedBookCount: 0,
        canRenew: false,
        renewalErrorMessage: "Không thể gia hạn: Tất cả sách đã được trả.",
        newDueDate: "",
      };
    }

    const maxRenewalCount = unreturnedBooks.reduce(
      (max, detail) => Math.max(max, detail.renewal_count),
      0,
    );

    let canRenew = true;
    let renewalErrorMessage = "";
    let newDueDate = "";

    if (maxRenewalCount >= renewalSettings.maxRenewals) {
      canRenew = false;
      renewalErrorMessage = `Không thể gia hạn: Đã đạt giới hạn ${renewalSettings.maxRenewals} lần gia hạn.`;
    } else if (loan.status === "Quá hạn") {
      canRenew = false;
      renewalErrorMessage = "Không thể gia hạn: Sách đã quá hạn.";
    } else {
      const currentDueDate = new Date(loan.dueDate);
      const newDate = addDays(currentDueDate, renewalSettings.renewalDays);
      newDueDate = format(newDate, "dd/MM/yyyy");
    }

    return {
      currentRenewalCount: maxRenewalCount,
      unreturnedBookCount,
      canRenew,
      renewalErrorMessage,
      newDueDate,
    };
  } catch (error) {
    console.error("Error checking renewal eligibility:", error);
    throw error;
  }
}

export async function renewBooks(
  loan: FormattedLoanTransaction,
  currentRenewalCount: number,
  renewalSettings: RenewalSettings,
  unreturnedBookCount: number,
): Promise<void> {
  try {
    const supabase = supabaseClient();

    const { error: loanDetailError } = await supabase
      .from("loandetail")
      .update({ renewal_count: currentRenewalCount + 1 })
      .eq("loan_transaction_id", loan.id)
      .is("return_date", null);

    if (loanDetailError) {
      console.error("Error updating loan details:", loanDetailError);
      toast({
        title: "Lỗi",
        description: "Không thể gia hạn sách. Vui lòng thử lại sau.",
        variant: "destructive",
      });
      throw new Error("Không thể cập nhật thông tin gia hạn");
    }

    const currentDueDate = new Date(loan.dueDate);
    const newDueDate = addDays(currentDueDate, renewalSettings.renewalDays);

    const { error: loanTransactionError } = await supabase
      .from("loantransaction")
      .update({
        due_date: format(newDueDate, "yyyy-MM-dd"),
        loan_status: "Đang mượn",
      })
      .eq("loan_transaction_id", loan.id);

    if (loanTransactionError) {
      console.error("Error updating loan transaction:", loanTransactionError);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật hạn trả sách. Vui lòng thử lại sau.",
        variant: "destructive",
      });
      throw new Error("Không thể cập nhật giao dịch mượn");
    }

    toast({
      title: "Thành công",
      description: `Gia hạn ${unreturnedBookCount} sách thành công!`,
      variant: "default",
    });
  } catch (error) {
    console.error("Error renewing books:", error);
    toast({
      title: "Lỗi",
      description: "Đã xảy ra lỗi khi gia hạn sách. Vui lòng thử lại sau.",
      variant: "destructive",
    });
    throw error;
  }
}
