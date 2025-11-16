import { SignIn } from '@clerk/nextjs';
import { locales } from '@/i18n/request';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return locales.map((locale) => ({
    locale,
    'sign-in': [],
  }));
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access the administrative dashboard
          </p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg',
            },
          }}
        />
      </div>
    </div>
  );
}
