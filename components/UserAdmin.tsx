'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { UserRole, UserSummary } from '@/types';

export default function UserAdmin() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserSummary | null>(null);
  const [message, setMessage] = useState('');
  const inputClass =
    'w-full border border-slate-300 bg-white rounded-xl px-4 py-3 text-slate-950 font-semibold placeholder:text-slate-500';

  const userIsActive = (user: UserSummary) =>
    user.isActive ?? user.is_active ?? true;

  const loadUsers = async () => {
    const response = await fetch('/api/users');

    if (!response.ok) {
      setMessage('Unable to load users');
      return;
    }

    setUsers(await response.json());
  };

  useEffect(() => {
    void Promise.resolve().then(() => loadUsers());
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('staff');
  };

  const startEdit = (user: UserSummary) => {
    setEditingId(user.id);
    setUsername(user.username);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setMessage(`Editing ${user.username}`);
  };

  const saveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (!username.trim() || !email.trim() || (!editingId && !password.trim())) {
      setMessage(
        editingId
          ? 'Username and email are required'
          : 'Username, email, and password are required'
      );
      return;
    }

    setLoading(true);

    const response = await fetch(editingId ? `/api/users/${editingId}` : '/api/users', {
      method: editingId ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        email,
        password,
        role,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data?.message || 'Unable to save user');
      return;
    }

    setMessage(editingId ? 'User updated' : 'User created');
    resetForm();
    await loadUsers();
  };

  const deleteUser = async () => {
    if (!pendingDelete) {
      return;
    }

    setDeletingId(pendingDelete.id);
    setMessage('');

    const response = await fetch(`/api/users/${pendingDelete.id}`, {
      method: 'DELETE',
    });

    setDeletingId(null);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data?.message || 'Unable to delete user');
      return;
    }

    if (editingId === pendingDelete.id) {
      resetForm();
    }

    setPendingDelete(null);
    setMessage('User marked inactive');
    await loadUsers();
  };

  return (
    <div className="space-y-5 text-slate-950">
      <form
        onSubmit={saveUser}
        className="bg-white border border-slate-300 rounded-2xl p-5 grid md:grid-cols-5 gap-4 items-end shadow-sm"
      >
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Username
          </span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={inputClass}
            placeholder="staff1"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="staff@example.com"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            {editingId ? 'New Password' : 'Password'}
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder={editingId ? 'Leave blank to keep' : 'Temporary password'}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Role
          </span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className={inputClass}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="bg-green-900 text-white rounded-xl px-5 py-3 font-semibold hover:bg-green-800 disabled:opacity-60"
        >
          {loading
            ? 'Saving...'
            : editingId
              ? 'Update User'
              : 'Create User'}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
          >
            <X size={18} />
            Cancel
          </button>
        )}
      </form>

      {message && (
        <p className="bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800">
          {message}
        </p>
      )}

      <div className="bg-white rounded-2xl border border-slate-300 overflow-auto shadow-sm">
        <table className="w-full text-slate-950">
          <thead className="bg-green-50 text-green-900">
            <tr>
              <th className="p-3 text-left">Username</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-200">
                <td className="p-3">{user.username}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3 capitalize">{user.role}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      userIsActive(user)
                        ? 'bg-green-100 text-green-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {userIsActive(user) ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-3">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {user.role === 'admin' ? (
                      <span className="text-sm font-semibold text-slate-500">
                        Locked
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(user)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50"
                          aria-label={`Edit ${user.username}`}
                          title="Edit user"
                        >
                          <Pencil size={16} />
                        </button>
                        {userIsActive(user) && (
                          <button
                            type="button"
                            onClick={() => setPendingDelete(user)}
                            disabled={deletingId === user.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40"
                            aria-label={`Mark ${user.username} inactive`}
                            title="Mark inactive"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Mark staff inactive?"
        message={`Are you sure you want to mark ${
          pendingDelete?.username || 'this user'
        } inactive? They will no longer be able to login, but their historical entries will remain linked.`}
        confirmLabel="Mark inactive"
        loading={Boolean(deletingId)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={deleteUser}
      />
    </div>
  );
}
