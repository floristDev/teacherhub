"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

export async function inviteMember(formData: FormData) {
  const session = await requireAuth();
  const email = formData.get("email") as string;
  const role = (formData.get("role") as string) || "MEMBER";
  const organizationId = formData.get("organizationId") as string;

  if (!session.organizationId || session.organizationId !== organizationId) {
    throw new Error("Forbidden");
  }

  let user = await db.user.findUnique({ where: { email } });

  if (!user) {
    user = await db.user.create({
      data: { email, name: email.split("@")[0] },
    });
  }

  await db.membership.create({
    data: {
      userId: user.id,
      organizationId,
      role: role as any,
    },
  });

  revalidatePath("/dashboard/team");
}

export async function removeMember(formData: FormData) {
  const session = await requireAuth();
  const membershipId = formData.get("membershipId") as string;

  const membership = await db.membership.findUnique({
    where: { id: membershipId },
  });

  if (!membership || membership.organizationId !== session.organizationId) {
    throw new Error("Forbidden");
  }

  await db.membership.delete({ where: { id: membershipId } });
  revalidatePath("/dashboard/team");
}
