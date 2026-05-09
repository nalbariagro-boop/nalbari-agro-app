'use client';

import { useState, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AppUser } from '@/types';

type Props = {
  onLogin: (user: AppUser) => void;
};

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Keep a ref to the password input so we can restore focus after toggling
  const passwordRef = useRef<HTMLInputElement>(null);

  const togglePassword = () => {
    setShowPassword((prev) => !prev);
    requestAnimationFrame(() => {
      passwordRef.current?.focus();
    });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Invalid credentials. Please try again.');
      }

      const data = (await res.json()) as { user: AppUser };
      onLogin(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-green-950 p-6"
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgba(5, 46, 22, 0.82), rgba(5, 46, 22, 0.48), rgba(15, 23, 42, 0.34)), url(/tea-garden-login.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur border border-white/70 rounded-2xl shadow-2xl p-6 space-y-5"
      >
        <div>
          <h1 className="text-2xl font-bold text-green-900">Nalbari Agro</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Enter your details to continue.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900"
            placeholder="Enter username"
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Password</span>
          <div className="relative">
            <input
              ref={passwordRef}

              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-14 text-slate-900"
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={togglePassword}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 cursor-pointer text-slate-400 hover:text-slate-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-900 text-white rounded-xl px-5 py-3 font-semibold hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>
      <footer className="absolute bottom-4 left-0 right-0 z-10 text-center text-sm font-semibold text-white drop-shadow">
        Made by ❤ Bikram 
      </footer>
    </main>
  );
}
