import { getTranslations } from 'next-intl/server';
import { currentUser } from '@clerk/nextjs/server';
import { DashboardContent } from './components/dashboard-content';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const t = await getTranslations();
  const user = await currentUser();
  const userData = user ? { firstName: user.firstName, lastName: user.lastName } : null;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <DashboardContent user={userData} />
      </div>
    </div>
  );
}
