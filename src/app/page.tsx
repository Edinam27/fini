import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

// Auth check reads cookies — this must be a blocking route, not prerendered.
export const instant = false;

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(user.onboarded ? "/dashboard" : "/onboarding");
}
