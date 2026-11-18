import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Sidebar, MobileNav } from "@/components/sidebar";

// Auth check reads cookies — this must be a blocking route, not prerendered.
export const instant = false;

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // New sign-ups must finish the welcome wizard first.
  if (!user.onboarded) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar username={user.username} email={user.email} />
      <MobileNav username={user.username} email={user.email} />
      <main className="px-6 py-6 max-lg:px-4 lg:ml-64">{children}</main>
    </div>
  );
}
