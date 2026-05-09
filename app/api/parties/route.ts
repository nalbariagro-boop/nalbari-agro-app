import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { optionalString, trimmedString } from "@/lib/validation";
import { Party } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);

    if (!auth.ok) {
      return auth.response;
    }

    const parties = await prisma.party.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return Response.json(parties);
  } catch (error) {
    return errorResponse(error, "Unable to load parties");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);

    if (!auth.ok) {
      return auth.response;
    }

    const party = (await request.json()) as Partial<Party>;
    const name = trimmedString(party.name, 200);
    const phone = optionalString(party.phone, 50);
    const area = optionalString(party.area, 200);
    const bank = optionalString(party.bank, 200);
    const accountNumber = optionalString(party.accountNumber, 100);
    const notes = optionalString(party.notes, 1_000);

    if (!name || phone === null || area === null || bank === null || accountNumber === null || notes === null) {
      return Response.json(
        { error: "Invalid party details" },
        { status: 400 }
      );
    }

    const created = await prisma.party.create({
      data: {
        name,
        phone,
        area,
        bank,
        accountNumber,
        notes,
      },
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save party");
  }
}
