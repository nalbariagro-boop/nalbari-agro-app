import { AppUser } from '@/types';

type Props = {
  user: AppUser;
  onLogout: () => void;
};

export default function Header({ user, onLogout }: Props) {
  return (
    <div className="bg-green-900 text-white rounded-3xl p-6 shadow-lg flex justify-between items-center gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-wide">
          NALBARI AGRO INDUSTRIES
        </h1>
        <p className="text-green-100 mt-1 text-sm">
          Green Leaf Procurement Management System
        </p>
      </div>

      <div className="text-right space-y-2">
        <p className="text-sm text-green-100 capitalize">
          {user.username} | {user.role}
        </p>
        <p className="text-xs text-green-200">
          {user.email}
        </p>
        <button
          onClick={onLogout}
          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
