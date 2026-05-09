import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { positiveInteger, trimmedString } from "@/lib/validation";
import { TimingRow } from "@/types";

export const runtime = "nodejs";

type TimingWithUser = Prisma.TimingReportGetPayload<{
  include: {
    createdBy: {
      select: {
        username: true;
      };
    };
  };
}>;

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function nullableDecimal(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? new Prisma.Decimal(numeric) : null;
}

function decimalString(value: Prisma.Decimal | null | undefined) {
  return value?.toString() || "";
}

function calculateAcceptableQuantity(row: TimingRow) {
  const wb = Number(row.wb || 0);
  const short = Number(row.short || 0);

  if (!Number.isFinite(wb) || wb <= 0) {
    return null;
  }

  if (!Number.isFinite(short) || short <= 0) {
    return new Prisma.Decimal(wb.toFixed(2));
  }

  return new Prisma.Decimal((wb - (wb * short) / 100).toFixed(2));
}

function serializeTiming(row: TimingWithUser) {
  return {
    id: row.id,
    userId: row.createdById || undefined,
    username: row.createdBy?.username || "",
    partyId: row.partyId || undefined,
    report_date: row.reportDate.toISOString().slice(0, 10),
    serial: row.serial,
    party: row.party,
    lorry: row.lorry || "",
    challan: row.challan || "",
    challanWeight: decimalString(row.challanWeight),
    challan_weight: decimalString(row.challanWeight),
    wb: decimalString(row.wb),
    excess: decimalString(row.excess),
    short: decimalString(row.short),
    accept: decimalString(row.acceptQty),
    accept_qty: decimalString(row.acceptQty),
    fine: decimalString(row.fine),
    softBanji: decimalString(row.softBanji),
    soft_banji: decimalString(row.softBanji),
    coarse: decimalString(row.coarse),
    remarks: row.remarks || "",
    rate: decimalString(row.rate),
    amount: decimalString(row.amount),
    arrival: row.arrival || "",
  };
}

function updateData(row: TimingRow) {
  const acceptQty = calculateAcceptableQuantity(row);
  const rate = nullableDecimal(row.rate);

  return {
    party: row.party.trim(),
    partyId: positiveInteger(row.partyId) || null,
    lorry: nullableString(row.lorry),
    challan: nullableString(row.challan),
    challanWeight: nullableDecimal(row.challanWeight),
    wb: nullableDecimal(row.wb),
    excess: nullableDecimal(row.excess),
    short: nullableDecimal(row.short),
    acceptQty,
    fine: nullableDecimal(row.fine),
    softBanji: nullableDecimal(row.softBanji),
    coarse: nullableDecimal(row.coarse),
    remarks: nullableString(row.remarks),
    rate,
    amount: acceptQty && rate ? acceptQty.mul(rate) : null,
    arrival: nullableString(row.arrival),
  };
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
    const numericId = positiveInteger(id);
    const payload = (await request.json()) as TimingRow;
    const party = trimmedString(payload.party, 200);

    if (!numericId) {
      return Response.json({ error: "Invalid timing entry id" }, { status: 400 });
    }

    if (!party) {
      return Response.json({ error: "Party name is required" }, { status: 400 });
    }

    const timing = await prisma.timingReport.update({
      where: {
        id: numericId,
      },
      data: updateData({
        ...payload,
        party,
      }),
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    });

    return Response.json(serializeTiming(timing));
  } catch (error) {
    return errorResponse(error, "Unable to update timing entry");
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
    const numericId = positiveInteger(id);

    if (!numericId) {
      return Response.json({ error: "Invalid timing entry id" }, { status: 400 });
    }

    const deleted = await prisma.timingReport.delete({
      where: {
        id: numericId,
      },
    });

    const remaining = await prisma.timingReport.findMany({
      where: {
        reportDate: deleted.reportDate,
      },
      orderBy: {
        serial: "asc",
      },
      select: {
        id: true,
      },
    });

    await prisma.$transaction(
      remaining.map((row, index) =>
        prisma.timingReport.update({
          where: {
            id: row.id,
          },
          data: {
            serial: index + 1,
          },
        })
      )
    );

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to delete timing entry");
  }
}
