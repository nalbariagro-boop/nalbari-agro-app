export const paymentTypes = ["Cash", "Bank", "UPI", "Cheque"] as const;

export type PaymentType = (typeof paymentTypes)[number];

export function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

export function trimmedString(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

export function optionalString(value: unknown, maxLength = 500) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length <= maxLength ? trimmed : null;
}

export function positiveInteger(value: unknown) {
  const numeric = Number(value);

  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export function positiveNumber(value: unknown, max = 1_000_000_000) {
  const numeric = Number(value);

  return Number.isFinite(numeric) && numeric > 0 && numeric <= max
    ? numeric
    : null;
}

export function paymentType(value: unknown): PaymentType | null {
  return paymentTypes.includes(value as PaymentType)
    ? (value as PaymentType)
    : null;
}
