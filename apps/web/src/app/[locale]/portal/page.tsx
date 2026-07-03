'use client';

import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';
import { Shell } from '@/components/Shell';
import { api } from '@/lib/api';

interface PatientRow { id: string; handle: string; band: string; status: string; created_at: string }

export default function ProviderPortal() {
  const t = useTranslations('portal');
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [error, setError] = useState('');
  const [issueFor, setIssueFor] = useState<string | null>(null);
  const [level, setLevel] = useState('moderate');
  const [claimUrl, setClaimUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<PatientRow[]>('/portal/provider/patients').then((r) => setRows(r ?? [])).catch((e) => setError((e as Error).message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const issue = async (handle: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ claim_url: string }>('/portal/provider/credentials', {
        method: 'POST',
        body: JSON.stringify({
          user_handle: handle,
          level,
          basis: 'Professional assessment following screening and session',
          valid_months: 6,
        }),
      });
      setClaimUrl(res.claim_url || '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      <div className="mt-3 rounded-xl bg-primary-50 p-4 text-sm font-medium text-primary-800">{t('anonNote')}</div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3">{t('colPatient')}</th>
              <th className="px-5 py-3">{t('colBand')}</th>
              <th className="px-5 py-3">{t('colStatus')}</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0">
                <td className="px-5 py-3.5 font-semibold text-gray-900">{r.handle}</td>
                <td className="px-5 py-3.5 text-gray-600">{r.band}</td>
                <td className="px-5 py-3.5 text-gray-600">{r.status}</td>
                <td className="px-5 py-3.5">
                  <button onClick={() => { setIssueFor(r.handle); setClaimUrl(''); }} className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                    {t('issue')}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-6 text-gray-500">{t('empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {issueFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" onClick={() => setIssueFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">{t('issueTitle', { handle: issueFor })}</h2>
            <p className="mt-2 text-sm text-gray-600">{t('issueBody')}</p>
            {!claimUrl ? (
              <>
                <label className="mt-5 block text-sm font-semibold text-gray-700">{t('level')}</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5">
                  <option value="mild">{t('level_mild')}</option>
                  <option value="moderate">{t('level_moderate')}</option>
                  <option value="severe">{t('level_severe')}</option>
                </select>
                <button
                  onClick={() => issue(issueFor)}
                  disabled={busy}
                  className="mt-5 w-full rounded-lg bg-primary-600 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {busy ? '…' : t('sign')}
                </button>
              </>
            ) : (
              <div className="mt-5 text-center">
                <p className="text-sm font-semibold text-mint-700">✓ {t('issued')}</p>
                <div className="mt-4 flex justify-center"><QRCodeSVG value={claimUrl} size={160} /></div>
                <p className="mt-3 text-xs text-gray-500">{t('claimHint')}</p>
              </div>
            )}
            <button onClick={() => setIssueFor(null)} className="mt-5 w-full text-sm font-semibold text-gray-500">{t('close')}</button>
          </div>
        </div>
      )}
    </Shell>
  );
}
