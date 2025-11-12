import { type NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import CustomerLayout from "~/components/CustomerLayout";
import { api } from "~/utils/api";

const CustomerCart: NextPage = () => {
  const router = useRouter();
  const utils = api.useUtils();

  const { data: cart, isLoading } = api.cart.getCart.useQuery();

  const updateQuantityMutation = api.cart.updateQuantity.useMutation({
    onSuccess: () => {
      void utils.cart.getCart.invalidate();
    },
  });

  const removeItemMutation = api.cart.removeItem.useMutation({
    onSuccess: () => {
      void utils.cart.getCart.invalidate();
    },
  });

  const createOrderMutation = api.order.createFromCart.useMutation({
    onSuccess: (order) => {
      alert("Order placed successfully!");
      void router.push(`/customer/orders`);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      alert("Your cart is empty");
      return;
    }

    const confirmed = confirm(
      `Place order for $${(cart.total).toFixed(2)} (including GST)?`
    );

    if (confirmed) {
      createOrderMutation.mutate({});
    }
  };

  return (
    <CustomerLayout>
      <Head>
        <title>Shopping Cart - Jimmy Beef ERP</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Loading cart...</div>
          </div>
        ) : cart && cart.items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item: any) => (
                <div key={item.id} className="card">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                      {item.product.imageUrls[0] ? (
                        <img
                          src={item.product.imageUrls[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">No image</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-gray-600">{item.product.sku}</p>
                      <p className="text-sm text-gray-600">
                        ${item.unitPrice.toFixed(2)} per {item.product.unitOfMeasure}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value);
                          if (newQty > 0) {
                            updateQuantityMutation.mutate({
                              itemId: item.id,
                              quantity: newQty,
                            });
                          }
                        }}
                        className="w-20 input"
                      />
                      <span className="text-sm text-gray-600">
                        {item.product.unitOfMeasure}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        ${item.lineTotal.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        +${item.gst.toFixed(2)} GST
                      </p>
                    </div>
                    <button
                      onClick={() => removeItemMutation.mutate({ itemId: item.id })}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="card sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Order Summary
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>${cart.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST (10%):</span>
                    <span>${cart.gst.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2"></div>
                  <div className="flex justify-between text-xl font-bold text-gray-900">
                    <span>Total:</span>
                    <span>${cart.total.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={createOrderMutation.isLoading}
                  className="btn btn-primary w-full mt-6"
                >
                  {createOrderMutation.isLoading ? "Processing..." : "Checkout"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-600 mb-4">Your cart is empty</p>
            <button
              onClick={() => void router.push("/customer/products")}
              className="btn btn-primary"
            >
              Browse Products
            </button>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default CustomerCart;
