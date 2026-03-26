import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "./supabase";

export async function requireAuth(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json(
      { error: "인증이 필요합니다.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  return user;
}
