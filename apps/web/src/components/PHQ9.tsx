'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { api, Screening } from '@/lib/api';

const N = 9;

export function PHQ9({ onDone }: { onDone: (s: Screening, crisis: boolean, claimUrl: string) => void }) {
  const t = useTranslations('phq9');
  const locale = useLocale();
  const [step, setStep] = useState(0); // 0..2 (3 questions each)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(N).fill(null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const qs = [0, 1, 2].map((i) => step * 3 + i);
  const complete = qs.every((q) => answers[q] !== null);

  const pick = (q: number, v: number) => {
    const next = [...answers];
    next[q] = v;
    setAnswers(next);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ screening: Screening; crisis: boolean; claim_url: string }>('/screenings', {
        method: 'POST',
        body: JSON.stringify({ answers: answers.map((a) => a ?? 0) }),
      });
      onDone(res.screening, res.crisis, res.claim_url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="text-sm font-medium text-gray-500">
        {t('progress', { from: step * 3 + 1, to: step * 3 + 3 })} · {t('prompt')}
      </p>
      <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
        <div className="h-2 rounded-full bg-primary-600 transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} />
      </div>
      <div className="mt-8 flex flex-col gap-8">
        {qs.map((q) => (
          <div key={q}>
            <p className="font-semibold text-gray-900">
              {q + 1}. {t(`q${q + 1}`)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((v) => (
                <button
                  key={v}
                  onClick={() => pick(q, v)}
                  className={`rounded-lg border px-4 py-2 text-sm transition ${
                    answers[q] === v
                      ? 'border-primary-600 bg-primary-50 font-semibold text-primary-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t(`opt${v}`)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-10 flex items-center gap-4">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="text-sm font-semibold text-gray-500 hover:text-gray-700">
            {t('back')}
          </button>
        )}
        {step < 2 ? (
          <button
            disabled={!complete}
            onClick={() => setStep(step + 1)}
            className="rounded-lg bg-primary-600 px-8 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
          >
            {t('next')}
          </button>
        ) : (
          <button
            disabled={!complete || busy}
            onClick={submit}
            className="rounded-lg bg-primary-600 px-8 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
          >
            {busy ? '…' : t('seeResult')}
          </button>
        )}
      </div>
      <p className="mt-8 text-xs text-gray-400">{t('privacyNote', { locale })}</p>
    </div>
  );
}
