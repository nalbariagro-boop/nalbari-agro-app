import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toAppRole } from "@/lib/auth";
import { positiveInteger, trimmedString } from "@/lib/validation";

export const runtime = "nodejs";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function userResponse(user: {
  id: number;
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: toAppRole(user.role),
    isActive: user.isActive,
    is_active: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toDbRole(value: unknown) {
  return value === "admin" || value === "ADMIN" ? "ADMIN" : "STAFF";
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  const { id } = await context.params;
  const numericId = positiveInteger(id);

  if (!numericId) {
    return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
  }

  const { username, email, password, role } = await request.json();
  const nextUsername = trimmedString(username, 100);
  const nextEmail = trimmedString(email, 254)?.toLowerCase() || null;
  const hasPassword = typeof password === "string" && password.trim() !== "";
  const invalidPasswordType =
    password !== undefined && password !== "" && typeof password !== "string";
  const nextPassword = hasPassword ? trimmedString(password, 200) : null;

  if (
    !nextUsername ||
    !nextEmail ||
    !validEmail(nextEmail) ||
    invalidPasswordType ||
    (hasPassword && !nextPassword)
  ) {
    return NextResponse.json(
      { message: "Valid username and email are required" },
      { status: 400 }
    );
  }

  if (nextPassword && nextPassword.length < 8) {
    return NextResponse.json(
      { message: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const nextRole = toDbRole(role);

  if (admin.user.id === numericId && nextRole !== "ADMIN") {
    return NextResponse.json(
      { message: "You cannot remove your own admin access" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: {
        id: numericId,
      },
      data: {
        username: nextUsername,
        email: nextEmail,
        role: nextRole,
        ...(nextPassword
          ? {
              passwordHash: await bcrypt.hash(nextPassword, 12),
            }
          : {}),
      },
    });

    return NextResponse.json(userResponse(user));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Unable to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  const { id } = await context.params;
  const numericId = positiveInteger(id);

  if (!numericId) {
    return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
  }

  if (admin.user.id === numericId) {
    return NextResponse.json(
      { message: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  try {
    const target = await prisma.user.findUnique({
      where: {
        id: numericId,
      },
      select: {
        role: true,
        isActive: true,
      },
    });

    if (target?.role === "ADMIN") {
      return NextResponse.json(
        { message: "Admin users cannot be deleted" },
        { status: 400 }
      );
    }

    if (!target?.isActive) {
      return NextResponse.json({ ok: true });
    }

    await prisma.user.update({
      where: {
        id: numericId,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Unable to delete user" },
      { status: 500 }
    );
  }
}
