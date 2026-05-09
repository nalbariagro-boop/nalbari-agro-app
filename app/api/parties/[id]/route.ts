import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { optionalString, positiveInteger, trimmedString } from "@/lib/validation";
import { Party } from "@/types";

export const runtime = "nodejs";

function numericId(value: string) {
  return positiveInteger(value);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const partyId = numericId(id);
    const party = (await request.json()) as Partial<Party>;
    const phone = optionalString(party.phone, 50);
    const area = optionalString(party.area, 200);
    const bank = optionalString(party.bank, 200);
    const accountNumber = optionalString(party.accountNumber, 100);
    const notes = optionalString(party.notes, 1_000);

    if (!partyId) {
      return Response.json({ error: "Invalid party id" }, { status: 400 });
    }

    if (phone === null || area === null || bank === null || accountNumber === null || notes === null) {
      return Response.json({ error: "Invalid party details" }, { status: 400 });
    }

    const existing = await prisma.party.findUnique({
      where: {
        id: partyId,
      },
    });

    if (!existing) {
      return Response.json({ error: "Party not found" }, { status: 404 });
    }

    const name = trimmedString(party.name, 200);

    if (name && name !== existing.name) {
      return Response.json(
        { error: "Party name cannot be changed" },
        { status: 400 }
      );
    }

    const updated = await prisma.party.update({
      where: {
        id: partyId,
      },
      data: {
        phone,
        area,
        bank,
        accountNumber,
        notes,
      },
    });

    return Response.json(updated);
  } catch (error) {
    return errorResponse(error, "Unable to update party");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const partyId = numericId(id);

    if (!partyId) {
      return Response.json({ error: "Invalid party id" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.timingReport.updateMany({
        where: {
          partyId,
        },
        data: {
          partyId: null,
        },
      });

      await tx.ledgerEntry.updateMany({
        where: {
          partyId,
        },
        data: {
          partyId: null,
        },
      });

      await tx.party.delete({
        where: {
          id: partyId,
        },
      });
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to delete party");
  }
}
