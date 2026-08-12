'use client';

/**
 * TrustBox.tsx
 * -------------------------------------------------------------------------
 * Institutional trust + backlink-citation card.
 *
 * Renders a dated verification badge, a list of institutional citations,
 * a copyable "cite this tool" snippet (our backlink engine for bloggers,
 * advisors, and journalists), and an educational disclaimer.
 * -------------------------------------------------------------------------
 */

import { useState } from 'react';
import { ShieldCheck, BookMarked, Copy, Check, Info } from 'lucide-react';

export interface TrustSource {
  title: string;
  url: string;
  dateVerified: string;
}

export interface TrustBoxProps {
  /** Institutional citations backing the page's figures. */
  sources: TrustSource[];
  /** Page title used to build the citation snippet. Defaults to a generic label. */
  citationTitle?: string;
  /** Canonical URL used to build the citation snippet. */
  citationUrl?: string;
  /** Rules year shown in the verification badge. Defaults to 2026. */
  rulesYear?: number;
}

function buildPlainTextCitation(title: string, url: string, year: number): string {
  const accessed = new Date().toISOString().slice(0, 10);
  return `RetireEngine. "${title}." Accessed ${accessed}. ${url}`;
}

function buildBibTexCitation(title: string, url: string, year: number): string {
  const accessed = new Date().toISOString().slice(0, 10);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `@misc{retireengine-${slug},
  author = {{RetireEngine}},
  title = {${title}},
  year = {${year}},
  url = {${url}},
  note = {Accessed ${accessed}},
}`;
}

/** Reusable institutional trust + citation card for RetireEngine content pages. */
export default function TrustBox(props: TrustBoxProps) {
  const {
    sources,
    citationTitle = 'RetireEngine — Social Security Claiming Calculator',
    citationUrl = 'https://retireengine.com',
    rulesYear = 2026,
  } = props;

  const [format, setFormat] = useState<'plain' | 'bibtex'>('plain');
  const [copied, setCopied] = useState(false);

  const snippet =
    format === 'plain'
      ? buildPlainTextCitation(citationTitle, citationUrl, rulesYear)
      : buildBibTexCitation(citationTitle, citationUrl, rulesYear);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby="trustbox-heading"
      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6"
    >
      {/* 1. Dated verification badge */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-base font-semibold text-emerald-800">
        <ShieldCheck size={14} aria-hidden="true" />
        Data Verified for {rulesYear} Rules
      </div>

      <h2 id="trustbox-heading" className="mb-3 flex items-center gap-2 text-base font-semibold uppercase tracking-wide text-slate-700">
        <BookMarked size={16} className="text-teal-700" aria-hidden="true" />
        Sources &amp; citations
      </h2>

      {/* 2. Institutional citations list */}
      <ul className="mb-5 space-y-2 text-base text-slate-700">
        {sources.map((source) => (
          <li key={source.url} className="flex flex-col gap-0.5 border-b border-slate-200 pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-medium text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-800"
            >
              {source.title}
            </a>
            <span className="shrink-0 text-base text-slate-500">Verified {source.dateVerified}</span>
          </li>
        ))}
      </ul>

      {/* 3. Cite this tool / page box */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-base font-semibold text-slate-800">Cite this tool / page</span>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label="Citation format">
            <button
              type="button"
              role="radio"
              aria-checked={format === 'plain'}
              onClick={() => setFormat('plain')}
              className={[
                'rounded-md px-2.5 py-1 text-base font-medium transition-colors',
                format === 'plain' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              Plain text
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={format === 'bibtex'}
              onClick={() => setFormat('bibtex')}
              className={[
                'rounded-md px-2.5 py-1 text-base font-medium transition-colors',
                format === 'bibtex' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              BibTeX
            </button>
          </div>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 text-base leading-relaxed text-slate-100">
          {snippet}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className={[
            'mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-base font-semibold transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1',
            copied ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-700 text-white hover:bg-teal-800',
          ].join(' ')}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy citation'}
        </button>
      </div>

      {/* 4. Educational disclaimer */}
      <p className="flex items-start gap-2 text-base leading-relaxed text-slate-500">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
        Educational planning tool only; not financial, tax, or legal advice.
      </p>
    </section>
  );
}
