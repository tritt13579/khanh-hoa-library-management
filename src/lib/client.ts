import { createBrowserClient } from "@supabase/ssr";

export const supabaseClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

export async function getUser() {
  const supabase = supabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error(error);
    return null;
  }

  return data.user;
}
