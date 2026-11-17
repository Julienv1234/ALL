'use client';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { cloudConfigured } from '@/lib/cloud-config';

const Gate = dynamic(() => import('./Gate'), {
  ssr: false,
  loading: () => <main id="inhoud" tabIndex={-1} className="main" aria-busy="true" />,
});

/** Without Supabase settings the app opens straight away and the Supabase library is never downloaded. */
export default function AuthGate({ children }: { children: ReactNode }) {
  if (!cloudConfigured) return <>{children}</>;
  return <Gate>{children}</Gate>;
}
