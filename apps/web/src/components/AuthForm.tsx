'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api, setToken } from '@/lib/api';
import { useRouter } from '@/i18n/routing';

export function AuthForm({ mode }: { mode: 'signup' | 'login' }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body =
        mode === 'signup'
          ? { handle, email, password, locale: document.documentElement.lang }
          : { login: handle || email, password };
      const res = await api<{ access_token: string }>(`/auth/${mode === 'signup' ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setToken(res.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm mx-auto flex flex-col gap-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {mode === 'signup' ? t('handle') : t('handleOrEmail')}
        </label>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={t('handlePlaceholder')}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
          required
        />
        {mode === 'signup' && <p className="mt-1.5 text-xs text-primary-600">{t('handleHint')}</p>}
      </div>
      {mode === 'signup' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
            required
          />
          <p className="mt-1.5 text-xs text-gray-500">{t('emailHint')}</p>
        </div>
      )}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('password')}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="rounded-lg bg-primary-600 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition"
      >
        {busy ? '…' : mode === 'signup' ? t('createAccount') : t('logIn')}
      </button>
      {mode === 'signup' && <p className="text-center text-xs text-gray-500">{t('noPhone')}</p>}
    </form>
  );
}
