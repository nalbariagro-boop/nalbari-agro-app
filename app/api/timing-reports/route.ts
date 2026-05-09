import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { parseDateOnly, positiveInteger, trimmedString } from "@/lib/validation";
import { TimingRow } from "@/types";

export const runtime = "nodejs";

type SaveTimingPayload = {
  date?: string;
  rows?: TimingRow[];
};

type SaveTimingEntryPayload = TimingRow & {
  date?: string;
};

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

function serializeTiming(row: TimingWithUser | null) {
  if (!row) {
    return null;
  }

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
    moisture: decimalString(row.moisture),
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

async function nextSerial(reportDate: Date) {
  const aggregate = await prisma.timingReport.aggregate({
    where: {
      reportDate,
    },
    _max: {
      serial: true,
    },
  });

  return (aggregate._max.serial || 0) + 1;
}

function timingCreateData(
  row: TimingRow,
  reportDate: Date,
  serial: number,
  userId?: number | null
) {
  const acceptQty = calculateAcceptableQuantity(row);
  const rate = nullableDecimal(row.rate);

  return {
    reportDate,
    serial,
    partyId: positiveInteger(row.partyId) || null,
    party: row.party.trim(),
    lorry: nullableString(row.lorry),
    challan: nullableString(row.challan),
    challanWeight: nullableDecimal(row.challanWeight),
    wb: nullableDecimal(row.wb),
    excess: nullableDecimal(row.excess),
    short: nullableDecimal(row.short),
    moisture: null,
    acceptQty,
    fine: nullableDecimal(row.fine),
    softBanji: nullableDecimal(row.softBanji),
    coarse: nullableDecimal(row.coarse),
    remarks: nullableString(row.remarks),
    rate,
    amount: acceptQty && rate ? acceptQty.mul(rate) : null,
    arrival: nullableString(row.arrival),
    createdById: userId || null,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);

    if (!auth.ok) {
      return auth.response;
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const reportDate = parseDateOnly(date);
    const page = Number(url.searchParams.get("page") || "0");
    const pageSize = Number(url.searchParams.get("pageSize") || "10");
    const paginated = page > 0;

    if (!reportDate) {
      return Response.json(
        { error: "Valid date query parameter is required" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(page) ||
      page < 0 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return Response.json({ error: "Invalid pagination" }, { status: 400 });
    }

    const where = {
      reportDate,
    };

    const timing = await prisma.timingReport.findMany({
      where,
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        serial: "asc",
      },
      ...(paginated
        ? {
            skip: (page - 1) * pageSize,
            take: pageSize,
          }
        : {}),
    });

    const data = timing.map(serializeTiming).filter(Boolean);

    if (!paginated) {
      return Response.json(data);
    }

    const total = await prisma.timingReport.count({
      where,
    });

    return Response.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    return errorResponse(error, "Unable to load timing report");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);

    if (!auth.ok) {
      return auth.response;
    }

    const payload = (await request.json()) as SaveTimingEntryPayload;
    const reportDate = parseDateOnly(payload.date);
    const party = trimmedString(payload.party, 200);

    if (!reportDate || !party) {
      return Response.json(
        { error: "Valid date and party name are required" },
        { status: 400 }
      );
    }

    const serial = await nextSerial(reportDate);

    const timing = await prisma.timingReport.create({
      data: timingCreateData(
        {
          ...payload,
          party,
        },
        reportDate,
        serial,
        auth.user.id
      ),
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    });

    return Response.json(serializeTiming(timing), { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save timing entry");
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireUser(request);

    if (!auth.ok) {
      return auth.response;
    }

    const payload = (await request.json()) as SaveTimingPayload;
    const reportDate = parseDateOnly(payload.date);

    if (!reportDate || !Array.isArray(payload.rows)) {
      return Response.json(
        { error: "Valid date and rows are required" },
        { status: 400 }
      );
    }

    const validRows = payload.rows
      .map((row) => ({
        ...row,
        party: trimmedString(row.party, 200) || "",
      }))
      .filter((row) => row.party);

    await prisma.$transaction(async (tx) => {
      await tx.timingReport.deleteMany({
        where: {
          reportDate,
        },
      });

      if (!validRows.length) {
        return;
      }

      await tx.timingReport.createMany({
        data: validRows.map((row, index) => ({
          ...timingCreateData(row, reportDate, index + 1),
        })),
      });

      await tx.ledgerEntry.deleteMany({
        where: {
          txnDate: reportDate,
          description: "Green Leaf Purchase",
        },
      });
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to save timing report");
  }
}
