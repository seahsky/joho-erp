import { getTranslations } from 'next-intl/server';
import { currentUser } from '@clerk/nextjs/server';
import { DashboardContent } from './components/dashboard-content';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const t = await getTranslations();
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl md:text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {t('dashboard.subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <DashboardContent user={user} />
      </div>
    </div>
  );
}
