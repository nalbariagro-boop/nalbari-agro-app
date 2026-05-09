// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, toAppRole } from "@/lib/auth";
import { trimmedString } from "@/lib/validation";

const invalidLoginMessage = "Invalid username or password";
const windowMs = 15 * 60 * 1000;
const maxAttempts = 8;

const globalForLogin = globalThis as unknown as {
    loginAttempts?: Map<string, { count: number; resetAt: number }>;
};

const loginAttempts =
    globalForLogin.loginAttempts ?? new Map<string, { count: number; resetAt: number }>();

if (process.env.NODE_ENV !== "production") {
    globalForLogin.loginAttempts = loginAttempts;
}

function clientKey(req: NextRequest, username: string) {
    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip =
        forwardedFor ||
        req.headers.get("x-real-ip") ||
        "unknown";

    return `${ip}:${username.trim().toLowerCase()}`;
}

function tooManyAttempts(key: string) {
    const now = Date.now();
    const current = loginAttempts.get(key);

    if (!current || current.resetAt <= now) {
        return false;
    }

    return current.count >= maxAttempts;
}

function recordFailedAttempt(key: string) {
    const now = Date.now();
    const current = loginAttempts.get(key);

    if (!current || current.resetAt <= now) {
        loginAttempts.set(key, {
            count: 1,
            resetAt: now + windowMs,
        });
        return;
    }

    current.count += 1;
}

export async function POST(req: NextRequest) {
    try {
        const { username, password } = await req.json();
        const nextUsername = trimmedString(username, 100);
        const nextPassword = trimmedString(password, 200);

        if (!nextUsername || !nextPassword) {
            return NextResponse.json(
                { message: "Username and password are required" },
                { status: 400 }
            );
        }

        const key = clientKey(req, nextUsername);

        if (tooManyAttempts(key)) {
            return NextResponse.json(
                { message: "Too many login attempts. Please try again later." },
                { status: 429 }
            );
        }

        const user = await prisma.user.findUnique({
            where: {
                username: nextUsername,
            },
        });

        if (!user) {
            recordFailedAttempt(key);
            return NextResponse.json(
                { message: invalidLoginMessage },
                { status: 401 }
            );
        }

        if (!user.isActive) {
            recordFailedAttempt(key);
            return NextResponse.json(
                { message: invalidLoginMessage },
                { status: 401 }
            );
        }

        const validPassword = await bcrypt.compare(
            nextPassword,
            user.passwordHash
        );

        if (!validPassword) {
            recordFailedAttempt(key);
            return NextResponse.json(
                { message: invalidLoginMessage },
                { status: 401 }
            );
        }

        loginAttempts.delete(key);

        const token = signToken({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json(
            {
                message: "Login successful",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: toAppRole(user.role),
                },
            },
            { status: 200 }
        );

        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);

        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        );
    }
}
