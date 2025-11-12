import { type NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import AdminLayout from "~/components/AdminLayout";
import { api } from "~/utils/api";

const AdminOrders: NextPage = () => {
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "PROCESSING" | "PACKED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | "">("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: orders, isLoading } = api.order.getAll.useQuery({
    status: statusFilter || undefined,
  });

  const { data: orderDetails } = api.order.getById.useQuery(
    { id: selectedOrder! },
    { enabled: !!selectedOrder }
  );

  const updateStatusMutation = api.order.updateStatus.useMutation({
    onSuccess: () => {
      alert("Order status updated successfully!");
      void utils.order.getAll.invalidate();
      void utils.order.getById.invalidate({ id: selectedOrder! });
    },
  });

  const handleStatusChange = (orderId: string, newStatus: any) => {
    const confirmed = confirm(`Change order status to ${newStatus}?`);
    if (confirmed) {
      updateStatusMutation.mutate({
        id: orderId,
        status: newStatus,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800";
      case "PACKED":
        return "bg-purple-100 text-purple-800";
      case "OUT_FOR_DELIVERY":
        return "bg-indigo-100 text-indigo-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <Head>
        <title>Orders - Jimmy Beef ERP Admin</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="input"
              >
                <option value="">All Orders</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="PACKED">Packed</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Loading orders...</div>
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </div>
                      {order.afterCutoff && (
                        <span className="text-xs text-orange-600">After Cutoff</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.customer.businessName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.deliverySuburb}, {order.deliveryArea}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedOrder(order.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      {order.status === "PENDING" && (
                        <button
                          onClick={() =>
                            handleStatusChange(order.id, "PROCESSING")
                          }
                          className="text-green-600 hover:text-green-900"
                        >
                          Process
                        </button>
                      )}
                      {order.status === "PROCESSING" && (
                        <button
                          onClick={() => handleStatusChange(order.id, "PACKED")}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Mark Packed
                        </button>
                      )}
                      {order.status === "PACKED" && (
                        <button
                          onClick={() =>
                            handleStatusChange(order.id, "OUT_FOR_DELIVERY")
                          }
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Out for Delivery
                        </button>
                      )}
                      {order.status === "OUT_FOR_DELIVERY" && (
                        <button
                          onClick={() =>
                            handleStatusChange(order.id, "DELIVERED")
                          }
                          className="text-green-600 hover:text-green-900"
                        >
                          Mark Delivered
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-600">No orders found</p>
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && orderDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Order Details - {orderDetails.orderNumber}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Customer</h4>
                  <p className="text-sm text-gray-600">
                    {orderDetails.customer.businessName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {orderDetails.customer.contactPerson}
                  </p>
                  <p className="text-sm text-gray-600">
                    {orderDetails.customer.user.email}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Delivery Address
                  </h4>
                  <p className="text-sm text-gray-600">
                    {orderDetails.deliveryStreet}
                  </p>
                  <p className="text-sm text-gray-600">
                    {orderDetails.deliverySuburb}, {orderDetails.deliveryState}{" "}
                    {orderDetails.deliveryPostcode}
                  </p>
                  <p className="text-sm text-gray-600">
                    Area: {orderDetails.deliveryArea}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-2">Order Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Product
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Quantity
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Unit Price
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orderDetails.items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.product.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.quantity} {item.product.unitOfMeasure}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            ${item.lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="text-right space-y-1">
                    <p className="text-sm text-gray-600">
                      Subtotal: ${orderDetails.subtotal.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      GST: ${orderDetails.gst.toFixed(2)}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      Total: ${orderDetails.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="btn btn-secondary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
