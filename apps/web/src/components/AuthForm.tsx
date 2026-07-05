'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api, setToken } from '@/lib/api';
import { useRouter } from '@/i18n/routing';

export function AuthForm({ mode }: { mode: 'signup' | 'login' }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [accountType, setAccountType] = useState<'user' | 'provider' | 'org'>('user');
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
          ? { handle, email, password, locale: document.documentElement.lang, account_type: accountType }
          : { login: handle || email, password };
      const res = await api<{ access_token: string }>(`/auth/${mode === 'signup' ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setToken(res.access_token);
      if (mode === 'signup' && accountType === 'org') router.push('/console');
      else if (mode === 'signup' && accountType === 'provider') router.push('/portal');
      else router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm mx-auto flex flex-col gap-4">
      {mode === 'signup' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('accountType')}</label>
          <div className="flex flex-col gap-2">
            {(['user', 'provider', 'org'] as const).map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setAccountType(v)}
                className={`rounded-lg border px-3.5 py-2.5 text-left text-sm transition ${
                  accountType === v ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <span className="font-semibold">{t(`type_${v}`)}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{t(`type_${v}Hint`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
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
