import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar username={session.username} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
