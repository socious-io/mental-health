'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';

interface Study {
  id: string; title_en: string; title_ja: string; reward_lovelace: number;
  target_participants: number; requires_treatment_need: boolean; status: string; escrow_tx?: string;
}
interface Row { id: string; handle?: string; status: string; progress: number; escrow_tx?: string; bind_tx?: string; release_tx?: string }

export default function OrgConsole() {
  const t = useTranslations('console');
  const locale = useLocale();
  const [studies, setStudies] = useState<Study[]>([]);
  const [parts, setParts] = useState<Record<string, Row[]>>({});
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title_en: '', title_ja: '', reward_ada: 5, target_participants: 20, requires_treatment_need: false });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const s = await api<Study[]>('/portal/org/studies');
      setStudies(s ?? []);
      const entries = await Promise.all(
        (s ?? []).map(async (st) => [st.id, await api<Row[]>(`/portal/org/studies/${st.id}/participants`)] as const),
      );
      setParts(Object.fromEntries(entries.map(([k, v]) => [k, v ?? []])));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('create');
    try {
      await api('/portal/org/studies', {
        method: 'POST',
        body: JSON.stringify({ ...form, description_en: form.title_en, description_ja: form.title_ja }),
      });
      await load();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(''); }
  };
  const fund = async (id: string) => {
    setBusy(id);
    try { await api(`/portal/org/studies/${id}/fund`, { method: 'POST' }); await load(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(''); }
  };
  const complete = async (pid: string) => {
    setBusy(pid);
    try { await api(`/portal/org/participations/${pid}/complete`, { method: 'POST' }); await load(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(''); }
  };

  const ada = (l: number) => `${(l / 1_000_000).toLocaleString()} ADA`;

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-gray-600">{t('subtitle')}</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <form onSubmit={create} className="mt-6 grid gap-3 rounded-xl border border-gray-200 bg-white p-6 sm:grid-cols-2">
        <h2 className="font-bold text-gray-900 sm:col-span-2">{t('newStudy')}</h2>
        <input required placeholder={t('titleEn')} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        <input required placeholder={t('titleJa')} value={form.title_ja} onChange={(e) => setForm({ ...form, title_ja: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          {t('rewardAda')}
          <input type="number" min={1} value={form.reward_ada} onChange={(e) => setForm({ ...form, reward_ada: Number(e.target.value) })} className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          {t('target')}
          <input type="number" min={1} value={form.target_participants} onChange={(e) => setForm({ ...form, target_participants: Number(e.target.value) })} className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
          <input type="checkbox" checked={form.requires_treatment_need} onChange={(e) => setForm({ ...form, requires_treatment_need: e.target.checked })} />
          {t('requiresTN')}
        </label>
        <button disabled={busy === 'create'} className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 sm:col-span-2">
          {busy === 'create' ? '…' : t('create')}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-5">
        {studies.map((s) => (
          <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">{locale === 'ja' ? s.title_ja : s.title_en}</h2>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">{ada(s.reward_lovelace)} / {t('perParticipant')}</span>
                <span className="text-xs font-semibold text-gray-500">{s.status}</span>
              </div>
            </div>
            {s.status === 'DRAFT' && (
              <button onClick={() => fund(s.id)} disabled={busy === s.id} className="mt-3 rounded-lg bg-mint-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-700 disabled:opacity-50">
                {busy === s.id ? '…' : t('fund')}
              </button>
            )}
            {s.status === 'DRAFT' && (
              <p className="mt-2 text-xs text-gray-500">{t('fundHint')}</p>
            )}
            {s.escrow_tx && (
              <a className="mt-2 inline-block text-xs font-medium text-mint-700 underline" target="_blank" rel="noreferrer"
                 href={`https://${process.env.NEXT_PUBLIC_CARDANO_NETWORK === 'mainnet' ? '' : 'preprod.'}cardanoscan.io/transaction/${s.escrow_tx}`}>
                {t('escrowTx')}
              </a>
            )}
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('participants')}</p>
              <div className="mt-2 flex flex-col gap-2">
                {(parts[s.id] ?? []).map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-gray-900">{p.handle}</span>
                    <span className="text-gray-600">{p.status} · {p.progress}%</span>
                    {p.escrow_tx && (
                      <a className="text-xs font-medium text-mint-700 underline" target="_blank" rel="noreferrer"
                         href={`https://${process.env.NEXT_PUBLIC_CARDANO_NETWORK === 'mainnet' ? '' : 'preprod.'}cardanoscan.io/transaction/${p.escrow_tx}`}>
                        {t('lockTx')}
                      </a>
                    )}
                    {p.status === 'COMPLETED' && (
                      <button onClick={() => complete(p.id)} disabled={busy === p.id} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                        {busy === p.id ? '…' : t('release')}
                      </button>
                    )}
                    {p.status === 'REWARDED' && <span className="text-xs font-semibold text-mint-700">✓ {t('released')}</span>}
                  </div>
                ))}
                {(parts[s.id] ?? []).length === 0 && <p className="text-sm text-gray-400">{t('noParticipants')}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-gray-400">{t('note')}</p>
    </Shell>
  );
}
