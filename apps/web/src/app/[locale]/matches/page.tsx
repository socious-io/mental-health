'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Shell } from '@/components/Shell';
import { api, Match } from '@/lib/api';

export default function MatchesPage() {
  const t = useTranslations('matches');
  const locale = useLocale();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [band, setBand] = useState('');
  const [error, setError] = useState('');
  const [booked, setBooked] = useState<string | null>(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api<{ band: string; matches: Match[] }>(`/providers/matches?lang=${locale}`)
      .then((r) => { setMatches(r.matches ?? []); setBand(r.band); })
      .catch((e) => setError((e as Error).message));
  }, [locale]);

  const book = async (providerId: string) => {
    setBusy(providerId);
    try {
      await api('/bookings', { method: 'POST', body: JSON.stringify({ provider_id: providerId, preferences: { lang: locale } }) });
      setBooked(providerId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      {band && <p className="mt-2 text-sm text-gray-500">{t('rankedFor', { band: t(`band_${band}`) })}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex flex-col gap-4">
        {matches?.map((m, i) => {
          const p = m.provider;
          const name = locale === 'ja' ? p.name_ja : p.name_en;
          const desc = locale === 'ja' ? p.description_ja : p.description_en;
          return (
            <div key={p.id} className={`rounded-xl border bg-white p-6 ${i === 0 ? 'border-primary-600 border-[1.5px]' : 'border-gray-200'}`}>
              {i === 0 && (
                <span className="mb-2 inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                  {t('bestMatch')}
                </span>
              )}
              <h2 className="text-lg font-bold text-gray-900">{name}</h2>
              <p className="mt-1 text-sm text-gray-600">{desc}</p>
              <p className="mt-2 text-xs font-medium text-primary-600">
                {t('matchesLabel')}: {m.reasons.map((r) => t(`reason_${r.replaceAll(' ', '_').replaceAll('(', '').replaceAll(')', '')}`)).join(' · ')}
              </p>
              <div className="mt-4 flex items-center gap-3">
                {p.anonymous_booking && (
                  <span className="rounded-full bg-mint-50 px-3 py-1 text-xs font-bold text-mint-700">{t('anonBooking')}</span>
                )}
                {booked === p.id ? (
                  <span className="text-sm font-semibold text-mint-700">{t('requested')}</span>
                ) : (
                  <button
                    onClick={() => book(p.id)}
                    disabled={busy !== ''}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${i === 0 ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {busy === p.id ? '…' : t('request')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {matches && matches.length === 0 && <p className="text-gray-500">{t('none')}</p>}
      </div>
      <p className="mt-6 text-xs text-gray-400">{t('note')}</p>
    </Shell>
  );
}
