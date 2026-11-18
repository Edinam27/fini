import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LoginForm from "./login-form";

// Reads cookies for the auth check — must be a blocking route, not prerendered.
export const instant = false;

export const metadata = { title: "Sign In — Freedom" };

export default async function LoginPage() {
  // Authoritative check: a user whose cookie exists but whose DB session has
  // idled out (30 min) gets the sign-in form, not a redirect loop.
  const user = await getSessionUser();
  if (user) redirect(user.onboarded ? "/dashboard" : "/onboarding");

  return <LoginForm />;
}
