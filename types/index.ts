export type TimingRow = {
  id?: number;
  report_date?: string;
  serial?: number;
  userId?: number;
  username?: string;
  partyId?: number;
  party: string;
  lorry: string;
  challan: string;
  challanWeight: string;
  wb: string;
  excess: string;
  short: string;
  accept: string;
  rate: string;
  fine: string;
  softBanji: string;
  coarse: string;
  remarks: string;
  arrival: string;
};

export type Party = {
  id?: number;
  name: string;
  phone: string;
  area: string;
  bank: string;
  accountNumber: string;
  notes: string;
};

export type LedgerEntry = {
  id?: number;
  txn_date: string;
  partyId?: number;
  party: string;
  description: string;
  txn_type: string;
  debit: number;
  credit: number;
};

export type UserRole = 'admin' | 'staff';

export type AppUser = {
  id: number;
  username: string;
  email: string;
  role: UserRole;
};

export type UserSummary = AppUser & {
  isActive?: boolean;
  is_active?: boolean;
  createdAt: string;
  updatedAt: string;
};
