import { SignUp } from '@clerk/nextjs';
import { locales } from '@/i18n/request';

export function generateStaticParams() {
  return locales.map((locale) => ({
    locale,
    'sign-up': [],
  }));
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create an account to access the administrative dashboard
          </p>
        </div>
        <SignUp
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
