import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuthPayload = {
  id: number;
  username: string;
  email: string;
  role: Role;
};

const defaultSecret = "development-only-change-me";

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  role: Role;
};

type AuthResult =
  | {
      ok: true;
      user: CurrentUser;
    }
  | {
      ok: false;
      response: Response;
    };

function jwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production.");
  }

  return defaultSecret;
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, jwtSecret(), {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, jwtSecret()) as AuthPayload;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";

  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function getCurrentUser(request: Request) {
  const token = cookieValue(request, "token");

  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(decodeURIComponent(token));
    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user?.isActive) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export async function requireUser(request: Request): Promise<AuthResult> {
  const user = await getCurrentUser(request);

  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    ok: true,
    user,
  };
}

export async function requireAdmin(request: Request): Promise<AuthResult> {
  const auth = await requireUser(request);

  if (!auth.ok) {
    return auth;
  }

  if (auth.user.role !== "ADMIN") {
    return {
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return auth;
}

export function toAppRole(role: Role) {
  return role === "ADMIN" ? "admin" : "staff";
}
