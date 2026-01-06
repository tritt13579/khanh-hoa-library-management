import { createClient, getUser } from "@/auth/server";
import NoFooterLayout from "@/components/layout/NoFooterLayout";
import NotificationsList from "@/components/reader/NotificationsList";

export default async function NotificationsPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">Vui lòng đăng nhập để xem thông báo.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: readerData } = await supabase
    .from("reader")
    .select("reader_id, first_name, last_name")
    .eq("auth_user_id", user.id)
    .single();

  if (!readerData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Không tìm thấy thông tin độc giả.</p>
      </div>
    );
  }

  const { data: notifications, error } = await supabase
    .from("notification")
    .select(
      "notification_id, message, created_date, is_read, notification_type, reservation_id, loan_transaction_id",
    )
    .eq("reader_id", readerData.reader_id)
    .order("created_date", { ascending: false });

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">Không thể tải thông báo.</p>
      </div>
    );
  }

  return (
    <NoFooterLayout>
      <div className="container mx-auto px-4 py-6">
        <NotificationsList notifications={(notifications || []) as any[]} />
      </div>
    </NoFooterLayout>
  );
}
