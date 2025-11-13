import { SignInButton, SignUpButton, UserButton, currentUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { LayoutDashboard, Users, Package, Truck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@jimmy-beef/ui';

export default async function Home() {
  const user = await currentUser();
  const t = await getTranslations();

  const features = [
    {
      title: t('customers.title'),
      description: t('customers.subtitle'),
      icon: Users,
      href: '/customers',
    },
    {
      title: t('dashboard.title'),
      description: t('dashboard.subtitle'),
      icon: LayoutDashboard,
      href: '/dashboard',
    },
    {
      title: t('products.name'),
      description: 'Manage products and inventory',
      icon: Package,
      href: '/products',
    },
    {
      title: t('deliveries.title'),
      description: t('deliveries.subtitle'),
      icon: Truck,
      href: '/deliveries',
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex mb-8">
        <p className="text-2xl font-bold">
          Jimmy Beef - {t('navigation.admin', { default: 'Admin Portal' })}
        </p>
        <div className="flex gap-4">
          {user ? <UserButton /> : (
            <>
              <SignInButton mode="modal">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  {t('common.signIn')}
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                  {t('common.signUp', { default: 'Sign Up' })}
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>

      <div className="relative flex place-items-center mb-16">
        <h1 className="text-4xl font-bold text-center">
          {t('common.welcome')} to Jimmy Beef ERP
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-5xl w-full">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.href} href={feature.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="h-8 w-8 text-blue-600" />
                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
