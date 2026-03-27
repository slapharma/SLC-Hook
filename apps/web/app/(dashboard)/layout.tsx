import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAuth();
  } catch {
    redirect("/login");
  }
  return <div className="min-h-screen bg-[#080810] text-white">{children}</div>;
}
