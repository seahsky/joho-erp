import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

const Home: NextPage = () => {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      const userRole = (session.user as any).role;
      if (userRole === "CUSTOMER") {
        void router.push("/customer/products");
      } else {
        void router.push("/admin/dashboard");
      }
    }
  }, [session, router]);

  return (
    <>
      <Head>
        <title>Jimmy Beef ERP - B2B Meat Distribution</title>
        <meta name="description" content="B2B Meat Distribution ERP System" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-blue-700">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            Jimmy Beef <span className="text-blue-300">ERP</span>
          </h1>
          <p className="text-xl text-white/90">
            B2B Meat Distribution System
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Link
              href="/customer/login"
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-6 text-white hover:bg-white/20 transition-colors"
            >
              <h3 className="text-2xl font-bold">Customer Portal →</h3>
              <div className="text-lg">
                Access your account, browse products, and place orders
              </div>
            </Link>
            <Link
              href="/admin/login"
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-6 text-white hover:bg-white/20 transition-colors"
            >
              <h3 className="text-2xl font-bold">Admin Portal →</h3>
              <div className="text-lg">
                Manage customers, products, orders, and inventory
              </div>
            </Link>
          </div>
          <div className="text-center">
            <Link
              href="/customer/register"
              className="text-white/80 hover:text-white underline"
            >
              New customer? Register here
            </Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;
