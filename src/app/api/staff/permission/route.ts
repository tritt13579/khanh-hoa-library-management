// /app/api//staff/permissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/admin";
import { createClient } from "@/auth/server";

export async function GET(req: NextRequest) {
  const { auth } = await createClient();
  const { data: user, error: userError } = await auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: staff, error: staffError } = await supabaseAdmin
    .from("staff")
    .select("role_id")
    .eq("auth_user_id", user.user.id)
    .single();

  if (staffError || !staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const { data: permissions, error: permError } = await supabaseAdmin
    .from("haspermissions")
    .select("permission:permission_id(permission_name)")
    .eq("role_id", staff.role_id);

  if (permError) {
    console.error(permError);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 },
    );
  }

  const permissionNames = permissions.map(
    (p: any) => p.permission?.permission_name,
  );
  return NextResponse.json({ permissions: permissionNames });
}
