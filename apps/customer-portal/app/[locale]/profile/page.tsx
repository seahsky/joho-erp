import { getTranslations } from 'next-intl/server';
import { currentUser } from '@clerk/nextjs/server';
import { ProfileContent } from './components/profile-content';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const t = await getTranslations();
  const user = await currentUser();
  const userData = user ? { firstName: user.firstName, lastName: user.lastName } : null;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <ProfileContent user={userData} />
      </div>
    </div>
  );
}
