import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-slate-900 text-sm">Phrase</span>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="text-xs text-slate-500 hover:text-slate-700">로그아웃</button>
        </form>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
