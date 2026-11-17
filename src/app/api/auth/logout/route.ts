import { ok, serverError } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export async function POST() {
  try {
    await destroySession();
    return ok({ loggedOut: true });
  } catch (err) {
    return serverError("logout", err);
  }
}
