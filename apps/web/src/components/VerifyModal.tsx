'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

// Two stages:
//  A) claim the MoyaOver18 eligibility credential into Socious Wallet
//  B) present it to the verification (web-app-v2 pattern: request → QR → poll)
// Both QR codes are BROWSER links (Shin pages that hand off to the wallet) —
// scanned with the phone camera, not the wallet's in-app scanner.
type Stage = 'attest' | 'claim' | 'verify' | 'verified' | 'error';

export function VerifyModal({ open, onClose, onVerified }: { open: boolean; onClose: () => void; onVerified: () => void }) {
  const t = useTranslations('verify');
  const [stage, setStage] = useState<Stage>('attest');
  const [claimUrl, setClaimUrl] = useState('');
  const [connectUrl, setConnectUrl] = useState('');
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    api<{ exists: boolean; claim_url?: string; status?: string }>('/credentials/over18')
      .then((r) => {
        if (r.exists && r.claim_url) {
          setClaimUrl(r.claim_url);
          setStage(r.status === 'CLAIMED' ? 'verify' : 'claim');
        } else if (r.exists) {
          setStage('verify'); // demo
        } else {
          setStage('attest');
        }
      })
      .catch(() => setStage('attest'));
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [open]);

  const issue = async () => {
    setBusy(true);
    try {
      const r = await api<{ claim_url: string; demo?: boolean }>('/credentials/over18', {
        method: 'POST',
        body: JSON.stringify({ attest: true }),
      });
      if (r.demo) setStage('verify');
      else { setClaimUrl(r.claim_url); setStage('claim'); }
    } catch { setStage('error'); }
    finally { setBusy(false); }
  };

  const startVerify = useCallback(async () => {
    try {
      const res = await api<{ connect_url?: string; verified?: boolean; demo?: boolean }>('/credentials/verifications', { method: 'POST' });
      if (res.verified) { setStage('verified'); onVerified(); return; }
      setConnectUrl(res.connect_url || '');
      timer.current = setInterval(async () => {
        try {
          const check = await api<{ verified: boolean }>('/credentials/verifications');
          if (check.verified) {
            if (timer.current) clearInterval(timer.current);
            setStage('verified');
            onVerified();
          }
        } catch { /* keep polling */ }
      }, 5000);
      setTimeout(() => timer.current && clearInterval(timer.current), 300000);
    } catch { setStage('error'); }
  }, [onVerified]);

  useEffect(() => {
    if (open && stage === 'verify') startVerify();
  }, [open, stage, startVerify]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900">{t('title')}</h2>

        {stage === 'attest' && (
          <>
            <p className="mt-2 text-sm text-gray-600">{t('attestBody')}</p>
            <label className="mt-5 flex items-start gap-2.5 rounded-lg border border-gray-200 p-4 text-left text-sm text-gray-700">
              <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-0.5" />
              {t('attestLabel')}
            </label>
            <button
              onClick={issue}
              disabled={!attested || busy}
              className="mt-5 w-full rounded-lg bg-primary-600 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
            >
              {busy ? '…' : t('attestCta')}
            </button>
            <p className="mt-3 text-xs text-gray-400">{t('attestNote')}</p>
          </>
        )}

        {stage === 'claim' && claimUrl && (
          <>
            <p className="mt-2 text-sm text-gray-600">{t('claimBody')}</p>
            <div className="mt-5 flex justify-center"><QRCodeSVG value={claimUrl} size={180} /></div>
            <p className="mt-3 text-xs font-semibold text-primary-700">{t('cameraHint')}</p>
            <a href={claimUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-gray-500 underline">{t('orOpenLink')}</a>
            <button
              onClick={() => setStage('verify')}
              className="mt-5 w-full rounded-lg bg-primary-600 py-2.5 font-semibold text-white hover:bg-primary-700"
            >
              {t('claimDone')}
            </button>
          </>
        )}

        {stage === 'verify' && (
          <>
            <p className="mt-2 text-sm text-gray-600">{t('body')}</p>
            {connectUrl && !connectUrl.startsWith('demo') ? (
              <>
                <div className="mt-5 flex justify-center"><QRCodeSVG value={connectUrl} size={180} /></div>
                <p className="mt-3 text-xs font-semibold text-primary-700">{t('cameraHint')}</p>
                <a href={connectUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-gray-500 underline">{t('orOpenLink')}</a>
                <p className="mt-4 text-xs text-gray-500">{t('waiting')}</p>
              </>
            ) : (
              <p className="mt-6 text-sm text-mint-700">{t('demoNote')}</p>
            )}
            <p className="mt-3 text-xs text-gray-400">
              {t('noWallet')}{' '}
              <a className="underline" href="https://wallet.socious.io/ios" target="_blank" rel="noreferrer">iOS</a>
              {' · '}
              <a className="underline" href="https://wallet.socious.io/android" target="_blank" rel="noreferrer">Android</a>
            </p>
          </>
        )}

        {stage === 'verified' && (
          <div className="mt-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-100 text-2xl text-mint-700">✓</div>
            <p className="mt-3 font-semibold text-gray-900">{t('done')}</p>
          </div>
        )}
        {stage === 'error' && <p className="mt-6 text-sm text-red-600">{t('error')}</p>}

        <button onClick={onClose} className="mt-6 text-sm font-semibold text-gray-500 hover:text-gray-700">{t('close')}</button>
      </div>
    </div>
  );
}
