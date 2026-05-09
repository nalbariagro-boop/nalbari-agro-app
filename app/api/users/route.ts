import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, toAppRole } from "@/lib/auth";
import { trimmedString } from "@/lib/validation";

export const runtime = "nodejs";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function userResponse(user: {
  id: number;
  username: string;
  email: string;
  role: "ADMIN" | "STAFF";
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

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(users.map(userResponse));
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin.ok) {
    return admin.response;
  }

  const { username, email, password, role } = await request.json();
  const nextUsername = trimmedString(username, 100);
  const nextEmail = trimmedString(email, 254)?.toLowerCase() || null;
  const nextPassword = trimmedString(password, 200);

  if (!nextUsername || !nextEmail || !validEmail(nextEmail) || !nextPassword || nextPassword.length < 8) {
    return NextResponse.json(
      { message: "Valid username, email, and password are required" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(nextPassword, 12);

  try {
    const user = await prisma.user.create({
      data: {
        username: nextUsername,
        email: nextEmail,
        passwordHash,
        role: role === "admin" || role === "ADMIN" ? "ADMIN" : "STAFF",
        isActive: true,
      },
    });

    return NextResponse.json(userResponse(user), { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Unable to create staff user" },
      { status: 500 }
    );
  }
}
