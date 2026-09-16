'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-cream-100 dark:bg-[#0d0f12] text-stone-900 dark:text-stone-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto bg-white dark:bg-stone-900 rounded-3xl border border-cream-200 dark:border-stone-800 shadow-xl p-8 sm:p-12 space-y-8">
        <div className="flex items-center justify-between pb-6 border-b border-cream-200 dark:border-stone-800">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
            <FileText className="w-4 h-4" />
            Terms of Service
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white">Terms of Service for PostNova</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">Last updated: September 16, 2026</p>
        </div>

        <section className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-white">1. Agreement to Terms</h2>
          <p>
            By accessing or using PostNova, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-white">2. Permitted Use & Adherence to Platform Policies</h2>
          <p>
            PostNova is designed for social media automation and bulk scheduling. You agree not to use the service for:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Publishing illegal, harmful, harassing, or infringing content.</li>
            <li>Violating the Meta (Facebook / Instagram) Platform Terms and Community Standards.</li>
            <li>Abusing API rate limits or spamming users with unsolicited direct messages.</li>
          </ul>
        </section>

        <section className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-white">3. Disclaimers & Limitation of Liability</h2>
          <p>
            PostNova is provided "as is" without warranty of any kind. We are not responsible for account suspensions or content removal initiated by third-party social networks (such as Meta or Google) resulting from user violations of third-party policies.
          </p>
        </section>

        <section className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-white">4. Contact Information</h2>
          <p>
            For questions about these Terms, please contact us at <a href="mailto:saurabhprajapatidev@gmail.com" className="font-bold underline text-amber-600">saurabhprajapatidev@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
