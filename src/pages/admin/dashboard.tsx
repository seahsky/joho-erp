import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import AdminLayout from "~/components/AdminLayout";
import { api } from "~/utils/api";

const AdminDashboard: NextPage = () => {
  const { data: customers } = api.customer.getAll.useQuery({});
  const { data: orders } = api.order.getAll.useQuery({});
  const { data: lowStock } = api.inventory.getLowStockAlerts.useQuery();

  const pendingCustomers = customers?.filter((c: any) => c.status === "PENDING") || [];
  const pendingOrders = orders?.filter((o: any) => o.status === "PENDING") || [];
  const afterCutoffOrders = orders?.filter((o: any) => o.afterCutoff && o.status === "PENDING") || [];

  return (
    <AdminLayout>
      <Head>
        <title>Dashboard - Jimmy Beef ERP Admin</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome to the admin portal
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/customers" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900">
                  {customers?.length || 0}
                </p>
              </div>
              {pendingCustomers.length > 0 && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    {pendingCustomers.length} pending
                  </span>
                </div>
              )}
            </div>
          </Link>

          <Link href="/admin/orders" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">
                  {orders?.length || 0}
                </p>
              </div>
              {pendingOrders.length > 0 && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {pendingOrders.length} pending
                  </span>
                </div>
              )}
            </div>
          </Link>

          <Link href="/admin/inventory" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-3xl font-bold text-gray-900">
                  {lowStock?.length || 0}
                </p>
              </div>
              {lowStock && lowStock.length > 0 && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Action needed
                  </span>
                </div>
              )}
            </div>
          </Link>

          <div className="card">
            <p className="text-sm font-medium text-gray-600">After Cutoff Orders</p>
            <p className="text-3xl font-bold text-gray-900">
              {afterCutoffOrders.length}
            </p>
            {afterCutoffOrders.length > 0 && (
              <p className="mt-2 text-sm text-orange-600">
                Requires attention
              </p>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        {pendingCustomers.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Pending Customer Approvals
            </h2>
            <div className="space-y-2">
              {pendingCustomers.slice(0, 5).map((customer: any) => (
                <Link
                  key={customer.id}
                  href={`/admin/customers/${customer.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {customer.businessName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {customer.contactPerson} - {customer.user.email}
                      </p>
                    </div>
                    <span className="text-sm text-blue-600 hover:text-blue-800">
                      Review →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            {pendingCustomers.length > 5 && (
              <div className="mt-4 text-center">
                <Link
                  href="/admin/customers?status=PENDING"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View all {pendingCustomers.length} pending approvals →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* After Cutoff Orders */}
        {afterCutoffOrders.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Orders After Cutoff Time
            </h2>
            <div className="space-y-2">
              {afterCutoffOrders.slice(0, 5).map((order: any) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block p-3 bg-orange-50 rounded-lg hover:bg-orange-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.orderNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.customer.businessName} - ${order.total.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-sm text-blue-600 hover:text-blue-800">
                      Process →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Low Stock Alert */}
        {lowStock && lowStock.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Low Stock Alerts
            </h2>
            <div className="space-y-2">
              {lowStock.slice(0, 5).map((product: any) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">
                      SKU: {product.sku} - Stock: {product.stockLevel}{" "}
                      {product.unitOfMeasure}
                    </p>
                  </div>
                  <Link
                    href="/admin/inventory"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Restock →
                  </Link>
                </div>
              ))}
            </div>
            {lowStock.length > 5 && (
              <div className="mt-4 text-center">
                <Link
                  href="/admin/inventory"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View all {lowStock.length} low stock items →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
