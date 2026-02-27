"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

export async function updateProfile(formData: FormData) {
  const session = await requireAuth();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  await db.user.update({
    where: { id: session.id },
    data: { name, email },
  });

  revalidatePath("/dashboard/settings");
}

export async function updateOrganization(formData: FormData) {
  const session = await requireAuth();
  const organizationId = formData.get("organizationId") as string;
  const name = formData.get("name") as string;

  if (!session.organizationId || session.organizationId !== organizationId) {
    throw new Error("Forbidden");
  }

  await db.organization.update({
    where: { id: organizationId },
    data: { name },
  });

  revalidatePath("/dashboard/settings");
}

export async function deleteAccount() {
  const session = await requireAuth();
  await db.user.delete({ where: { id: session.id } });
}
