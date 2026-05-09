import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { parseDateOnly } from "@/lib/validation";

export const runtime = "nodejs";

function numberValue(value: Prisma.Decimal | null) {
  return value ? Number(value.toString()) : 0;
}

function average(total: number, count: number) {
  return count ? total / count : 0;
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

    if (!reportDate) {
      return Response.json(
        { error: "Valid date query parameter is required" },
        { status: 400 }
      );
    }

    const rows = await prisma.timingReport.findMany({
      where: {
        reportDate,
      },
      orderBy: {
        serial: "asc",
      },
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.challanWeight += numberValue(row.challanWeight);
        acc.wb += numberValue(row.wb);
        acc.excess += numberValue(row.excess);
        acc.short += numberValue(row.short);
        acc.acceptableQuantity += numberValue(row.acceptQty);
        acc.fine += numberValue(row.fine);
        acc.softBanji += numberValue(row.softBanji);
        acc.coarse += numberValue(row.coarse);
        acc.rate += numberValue(row.rate);
        acc.amount += numberValue(row.amount);
        return acc;
      },
      {
        challanWeight: 0,
        wb: 0,
        excess: 0,
        short: 0,
        acceptableQuantity: 0,
        fine: 0,
        softBanji: 0,
        coarse: 0,
        rate: 0,
        amount: 0,
      }
    );

    return Response.json({
      date,
      entries: rows.length,
      parties: new Set(rows.map((row) => row.party)).size,
      totals,
      leafCountAverages: {
        fine: average(totals.fine, rows.length),
        softBanji: average(totals.softBanji, rows.length),
        coarse: average(totals.coarse, rows.length),
      },
      avgRatePerKg: totals.acceptableQuantity
        ? totals.amount / totals.acceptableQuantity
        : average(totals.rate, rows.filter((row) => row.rate).length),
      latestArrival: rows.at(-1)?.arrival || "",
    });
  } catch (error) {
    return errorResponse(error, "Unable to load daily timing report");
  }
}
