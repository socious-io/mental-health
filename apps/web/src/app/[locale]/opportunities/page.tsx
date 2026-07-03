'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';

interface StudyItem {
  id: string; title_en: string; title_ja: string; description_en: string; description_ja: string;
  reward_lovelace: number; target_participants: number; requires_treatment_need: boolean;
  status: string; escrow_tx?: string; eligible: boolean; missing?: string;
}
interface Participation { id: string; study_id: string; status: string; progress: number; release_tx?: string }

export default function Opportunities() {
  const t = useTranslations('opps');
  const locale = useLocale();
  const [studies, setStudies] = useState<StudyItem[]>([]);
  const [mine, setMine] = useState<Participation[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([
        api<StudyItem[]>('/studies'),
        api<Participation[]>('/studies/mine'),
      ]);
      setStudies(s ?? []);
      setMine(m ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const apply = async (id: string) => {
    try { await api(`/studies/${id}/apply`, { method: 'POST' }); await load(); }
    catch (e) { setError((e as Error).message); }
  };
  const checkin = async (pid: string) => {
    try { await api(`/studies/participations/${pid}/checkin`, { method: 'POST' }); await load(); }
    catch (e) { setError((e as Error).message); }
  };

  const ada = (l: number) => `${(l / 1_000_000).toLocaleString()} ADA`;

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-gray-600">{t('subtitle')}</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex flex-col gap-4">
        {studies.map((s) => {
          const p = mine.find((m) => m.study_id === s.id);
          return (
            <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900">{locale === 'ja' ? s.title_ja : s.title_en}</h2>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">{ada(s.reward_lovelace)}</span>
              </div>
              <p className="mt-1.5 text-sm text-gray-600">{locale === 'ja' ? s.description_ja : s.description_en}</p>
              {s.escrow_tx && (
                <a
                  className="mt-2 inline-block text-xs font-medium text-mint-700 underline"
                  href={`https://${process.env.NEXT_PUBLIC_CARDANO_NETWORK === 'mainnet' ? '' : 'preprod.'}cardanoscan.io/transaction/${s.escrow_tx}`}
                  target="_blank" rel="noreferrer"
                >
                  {t('escrowLink')}
                </a>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {!p && s.eligible && (
                  <button onClick={() => apply(s.id)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                    {t('apply')}
                  </button>
                )}
                {!p && !s.eligible && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    {t(`missing_${s.missing}`)}
                  </span>
                )}
                {p && p.status === 'ACTIVE' && (
                  <>
                    <span className="text-sm text-gray-600">{t('progress', { n: p.progress })}</span>
                    <button onClick={() => checkin(p.id)} className="rounded-lg bg-mint-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-700">
                      {t('checkin')}
                    </button>
                  </>
                )}
                {p && p.status === 'COMPLETED' && <span className="text-sm font-semibold text-gray-700">{t('completed')}</span>}
                {p && p.status === 'REWARDED' && (
                  <span className="text-sm font-semibold text-mint-700">
                    ✓ {t('rewarded')}
                    {p.release_tx && (
                      <a className="ml-2 underline" href={`https://${process.env.NEXT_PUBLIC_CARDANO_NETWORK === 'mainnet' ? '' : 'preprod.'}cardanoscan.io/transaction/${p.release_tx}`} target="_blank" rel="noreferrer">tx</a>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {studies.length === 0 && <p className="text-gray-500">{t('none')}</p>}
      </div>
      <p className="mt-6 text-xs text-gray-400">{t('note')}</p>
    </Shell>
  );
}
