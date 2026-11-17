import { serverError, requireUser } from "@/lib/api";
import { query } from "@/lib/db";

/** GET /api/export — CSV download of all transactions (Excel opens CSV). */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const rows = await query<{
      date: string;
      transaction_type: string;
      category: string;
      subcategory: string | null;
      amount: string;
      description: string | null;
      payment_method: string | null;
      tags: string | null;
    }>(
      `SELECT to_char(date, 'YYYY-MM-DD') AS date, transaction_type,
              category, subcategory, amount, description, payment_method, tags
         FROM transactions WHERE user_id = $1
        ORDER BY date DESC, id DESC`,
      [user.id]
    );

    const header = "Date,Type,Category,Subcategory,Amount,Description,Payment Method,Tags";
    const escape = (v: string | null) => {
      const s = v ?? "";
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      header,
      ...rows.map((r) =>
        [
          r.date,
          r.transaction_type,
          escape(r.category),
          escape(r.subcategory),
          r.amount,
          escape(r.description),
          escape(r.payment_method),
          escape(r.tags),
        ].join(",")
      ),
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return serverError("export", err);
  }
}
