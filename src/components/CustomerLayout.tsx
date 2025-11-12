import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactNode, useEffect } from "react";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      void router.push("/customer/login");
    } else if (session && (session.user as any).role !== "CUSTOMER") {
      void router.push("/admin/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <Link href="/customer/products" className="text-xl font-bold text-blue-600">
                  Jimmy Beef
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/customer/products"
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    router.pathname === "/customer/products"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Products
                </Link>
                <Link
                  href="/customer/cart"
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    router.pathname === "/customer/cart"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Cart
                </Link>
                <Link
                  href="/customer/orders"
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    router.pathname === "/customer/orders"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Orders
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="btn btn-secondary text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
