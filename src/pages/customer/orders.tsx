import { type NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import CustomerLayout from "~/components/CustomerLayout";
import { api } from "~/utils/api";

const CustomerOrders: NextPage = () => {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const { data: orders, isLoading } = api.order.getMyOrders.useQuery({});

  const { data: orderDetails } = api.order.getById.useQuery(
    { id: selectedOrder! },
    { enabled: !!selectedOrder }
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  return (
    <CustomerLayout>
      <Head>
        <title>My Orders - Jimmy Beef ERP</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Loading orders...</div>
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <div key={order.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {order.orderNumber}
                      </h3>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                      {order.afterCutoff && (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-orange-100 text-orange-800">
                          After Cutoff
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Ordered: {formatDate(order.orderDate)}
                    </p>
                    {order.estimatedDeliveryDate && (
                      <p className="text-sm text-gray-600">
                        Est. Delivery: {formatDate(order.estimatedDeliveryDate)}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      {order.items.length} item(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      ${order.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">incl. GST</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Order Items:
                  </h4>
                  <div className="space-y-2">
                    {order.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm text-gray-600"
                      >
                        <span>
                          {item.product.name} × {item.quantity}{" "}
                          {item.product.unitOfMeasure}
                        </span>
                        <span>${item.lineTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {order.statusHistory && order.statusHistory.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Status History:
                    </h4>
                    <div className="space-y-2">
                      {order.statusHistory.map((history: any) => (
                        <div
                          key={history.id}
                          className="flex justify-between text-sm text-gray-600"
                        >
                          <span>{history.status.replace(/_/g, " ")}</span>
                          <span>{formatDate(history.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-600 mb-4">You haven't placed any orders yet</p>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default CustomerOrders;
