import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactNode, useEffect } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      void router.push("/admin/login");
    } else if (session) {
      const userRole = (session.user as any).role;
      if (userRole === "CUSTOMER") {
        void router.push("/customer/products");
      }
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
      <nav className="bg-blue-800 shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <Link href="/admin/dashboard" className="text-xl font-bold text-white">
                  Jimmy Beef Admin
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/admin/dashboard"
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    router.pathname === "/admin/dashboard"
                      ? "border-white text-white"
                      : "border-transparent text-blue-100 hover:border-blue-300 hover:text-white"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/customers"
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    router.pathname.startsWith("/admin/customers")
                      ? "border-white text-white"
                      : "border-transparent text-blue-100 hover:border-blue-300 hover:text-white"
                  }`}
                >
                  Customers
                </Link>
                <Link
                  href="/admin/products"
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    router.pathname.startsWith("/admin/products")
                      ? "border-white text-white"
                      : "border-transparent text-blue-100 hover:border-blue-300 hover:text-white"
                  }`}
                >
                  Products
                </Link>
                <Link
                  href="/admin/orders"
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    router.pathname.startsWith("/admin/orders")
                      ? "border-white text-white"
                      : "border-transparent text-blue-100 hover:border-blue-300 hover:text-white"
                  }`}
                >
                  Orders
                </Link>
                <Link
                  href="/admin/inventory"
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    router.pathname.startsWith("/admin/inventory")
                      ? "border-white text-white"
                      : "border-transparent text-blue-100 hover:border-blue-300 hover:text-white"
                  }`}
                >
                  Inventory
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-white mr-4">
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
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
