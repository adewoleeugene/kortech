"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth/server";

export async function signOutAction() {
  await signOut();
  redirect("/");
}
