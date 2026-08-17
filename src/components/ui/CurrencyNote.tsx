'use client';

/**
 * CurrencyNote.tsx
 * -------------------------------------------------------------------------
 * Feature 6 (Currency / FX Exposure).
 *
 * Pure disclosure component — never forecasts exchange rates. Shows whether
 * a destination's local currency carries FX risk against a USD income.
 * -------------------------------------------------------------------------
 */

import type { UsdRelationship } from '@/lib/ss-engine';

export interface CurrencyNoteProps {
  localCurrency?: string;
  usdRelationship?: UsdRelationship;
}

/** Reusable currency/FX disclosure note. Renders nothing if no data exists. */
export default function CurrencyNote({ localCurrency, usdRelationship }: CurrencyNoteProps) {
  if (!localCurrency || !usdRelationship) return null;

  const isSafe = usdRelationship === 'usd' || usdRelationship === 'pegged';

  if (isSafe) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-base font-semibold text-emerald-800">
        Uses US dollars · no currency risk
      </span>
    );
  }

  return (
    <span className="inline-flex items-start gap-1 rounded-2xl bg-amber-100 px-3.5 py-2.5 text-base font-semibold text-amber-800">
      Spends in {localCurrency} · your USD income carries moderate exchange-rate risk — budget a 10–15% cushion
    </span>
  );
}