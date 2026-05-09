import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import {
  parseDateOnly,
  paymentType,
  positiveInteger,
  positiveNumber,
  trimmedString,
} from "@/lib/validation";

export const runtime = "nodejs";

type PaymentPayload = {
  date?: string;
  partyId?: number;
  party?: string;
  amount?: number;
  type?: "Cash" | "Bank" | "UPI" | "Cheque";
  reference?: string;
};

function numberValue(value: Prisma.Decimal | null) {
  return value ? Number(value.toString()) : 0;
}

function serializeLedger(entry: {
  id?: number;
  txnDate: Date;
  partyId?: number | null;
  party: string;
  description: string;
  txnType: string;
  debit: Prisma.Decimal | number;
  credit: Prisma.Decimal | number;
}) {
  return {
    id: entry.id,
    txn_date: entry.txnDate.toISOString().slice(0, 10),
    partyId: entry.partyId || undefined,
    party: entry.party,
    description: entry.description,
    txn_type: entry.txnType,
    debit:
      typeof entry.debit === "number" ? entry.debit : Number(entry.debit),
    credit:
      typeof entry.credit === "number" ? entry.credit : Number(entry.credit),
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);

    if (!auth.ok) {
      return auth.response;
    }

    const url = new URL(request.url);
    const rawPartyId = url.searchParams.get("partyId");
    const partyId = rawPartyId ? positiveInteger(rawPartyId) : null;
    const party = trimmedString(url.searchParams.get("party") || "", 200) || "";

    if (rawPartyId && !partyId) {
      return Response.json({ error: "Invalid party id" }, { status: 400 });
    }

    const timingWhere = {
      ...(partyId ? { partyId } : {}),
      ...(!partyId && party ? { party } : {}),
    };

    const ledgerWhere = {
      ...(partyId ? { partyId } : {}),
      ...(!partyId && party ? { party } : {}),
    };

    const [timingRows, payments] = await Promise.all([
      prisma.timingReport.findMany({
        where: timingWhere,
        orderBy: {
          reportDate: "asc",
        },
      }),
      prisma.ledgerEntry.findMany({
        where: ledgerWhere,
        orderBy: {
          txnDate: "asc",
        },
      }),
    ]);

    const purchases = timingRows.map((row) =>
      serializeLedger({
        id: row.id ? -row.id : undefined,
        txnDate: row.reportDate,
        partyId: row.partyId,
        party: row.party,
        description: `Green Leaf Purchase - Sl.No. ${row.serial}`,
        txnType: "Purchase",
        debit: numberValue(row.amount),
        credit: 0,
      })
    );

    const paymentRows = payments.map(serializeLedger);

    return Response.json(
      [...purchases, ...paymentRows].sort((a, b) =>
        a.txn_date.localeCompare(b.txn_date)
      )
    );
  } catch (error) {
    return errorResponse(error, "Unable to load ledger");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);

    if (!auth.ok) {
      return auth.response;
    }

    const payload = (await request.json()) as PaymentPayload;
    const txnDate = parseDateOnly(payload.date);
    const party = trimmedString(payload.party, 200);
    const amount = positiveNumber(payload.amount);
    const type = paymentType(payload.type);
    const partyId = payload.partyId ? positiveInteger(payload.partyId) : null;
    const reference =
      typeof payload.reference === "string" && payload.reference.trim()
        ? trimmedString(payload.reference, 200)
        : "";

    if (
      !txnDate ||
      !party ||
      !amount ||
      !type ||
      (payload.partyId && !partyId) ||
      reference === null
    ) {
      return Response.json(
        { error: "Invalid payment details" },
        { status: 400 }
      );
    }

    const description = reference
      ? `${type} Payment - ${reference}`
      : `${type} Payment`;

    const created = await prisma.ledgerEntry.create({
      data: {
        txnDate,
        partyId,
        party,
        description,
        txnType: type,
        debit: 0,
        credit: amount,
      },
    });

    return Response.json(serializeLedger(created), { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save payment");
  }
}
