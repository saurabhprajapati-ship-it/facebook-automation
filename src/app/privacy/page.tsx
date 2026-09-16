'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
          <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            Official Privacy Policy
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white">Privacy Policy for PostNova</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">Last updated: September 16, 2026</p>
        </div>

        <section className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-white">1. Introduction</h2>
          <p>
            Welcome to <strong>PostNova</strong> ("we", "our", or "us"). We are committed to protecting your privacy. This Privacy Policy explains how our application collects, uses, and safeguards information when you use our social media scheduling, Facebook, Instagram automation, and AI command center services.
          </p>
        </section>

        <section className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-white">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Google Authentication:</strong> When you sign in with Google, we receive your basic profile information (name, email address, and profile picture avatar) solely to verify your identity and create your user profile.</li>
            <li><strong>Connected Social Accounts:</strong> Facebook Page IDs, Instagram Professional account handles, and access tokens provided by you via official Meta APIs to publish posts, stories, or automate replies.</li>
            <li><strong>Media & Content:</strong> Images, videos, captions, and scheduling times that you deliberately choose to upload or schedule via Google Drive or directly through PostNova.</li>
          </ul>
        </section>

        <section className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-white">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To provide, operate, and maintain the PostNova scheduling dashboard.</li>
            <li>To authenticate you into your dashboard with 1-click Google Sign-In.</li>
            <li>To post authorized content to your connected Facebook Pages and Instagram accounts.</li>
            <li>We <strong>never sell, rent, or trade</strong> your personal information or connected page credentials to third parties or advertisers.</li>
          </ul>
        </section>

        <section className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-white">4. Google API User Data Policy Compliance</h2>
          <p>
            PostNova's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-amber-600 underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
          </p>
        </section>

        <section className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-white">5. Data Retention & Deletion</h2>
          <p>
            You have full control over your data. You can disconnect your Facebook and Instagram accounts or delete posts at any time directly from the PostNova interface. If you wish to request total deletion of your user account and stored data, please email our support team at <a href="mailto:saurabhprajapatidev@gmail.com" className="font-bold underline text-amber-600">saurabhprajapatidev@gmail.com</a>.
          </p>
        </section>

        <section className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-white">6. Contact Us</h2>
          <p>
            If you have questions or concerns regarding this Privacy Policy, please contact us at:
            <br />
            <strong>Developer / Admin:</strong> Saurabh Prajapat
            <br />
            <strong>Email:</strong> saurabhprajapatidev@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
}
