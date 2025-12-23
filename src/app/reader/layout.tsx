import { getUser } from "@/auth/server";
import ReaderHeader from "@/components/layout/ReaderHeader";
import FooterReaderPage from "@/components/FooterReaderPage";

export default async function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  return (
    // <RoleProtectedLayout requiredRole="reader">
    <div className="flex min-h-screen flex-col">
      <ReaderHeader user={user} />
      <main className="flex flex-1 flex-col px-4 pt-24 xl:px-8">
        {children}
      </main>
      <FooterReaderPage/>
    </div>
    // </RoleProtectedLayout>
  );
}
