import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Chào mừng đến với Library System</h1>
      <Link href="/reader" className="text-blue-500 hover:underline">
        Vào giao diện Độc giả
      </Link>
      <Link href="/staff" className="text-blue-500 hover:underline">
        Vào giao diện Nhân viên
      </Link>
    </main>
  );
}
