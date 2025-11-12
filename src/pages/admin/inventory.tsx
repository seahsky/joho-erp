import { type NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import { useForm } from "react-hook-form";
import AdminLayout from "~/components/AdminLayout";
import { api } from "~/utils/api";

type AdjustmentFormData = {
  productId: string;
  adjustmentType: "add" | "remove" | "set";
  quantity: number;
  reason: string;
  reference?: string;
};

const AdminInventory: NextPage = () => {
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: stockLevels, isLoading } = api.inventory.getStockLevels.useQuery({});
  const { data: products } = api.product.getAll.useQuery({});

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdjustmentFormData>();

  const adjustmentMutation = api.inventory.createAdjustment.useMutation({
    onSuccess: () => {
      alert("Stock adjusted successfully!");
      setShowAdjustmentModal(false);
      setSelectedProduct(null);
      reset();
      void utils.inventory.getStockLevels.invalidate();
      void utils.product.getAll.invalidate();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const onSubmit = (data: AdjustmentFormData) => {
    adjustmentMutation.mutate(data);
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return "text-green-600";
      case "Low Stock":
        return "text-yellow-600";
      case "Out of Stock":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>Inventory - Jimmy Beef ERP Admin</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <button
            onClick={() => {
              reset();
              setShowAdjustmentModal(true);
            }}
            className="btn btn-primary"
          >
            Adjust Stock
          </button>
        </div>

        {/* Stock Levels Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Loading inventory...</div>
          </div>
        ) : stockLevels && stockLevels.length > 0 ? (
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reorder Level
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
                {stockLevels.map((product: any) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.stockLevel} {product.unitOfMeasure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {product.reorderLevel} {product.unitOfMeasure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${getStockStatusColor(
                          product.stockStatus
                        )}`}
                      >
                        {product.stockStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setSelectedProduct(product.id);
                          setShowAdjustmentModal(true);
                          reset({
                            productId: product.id,
                            adjustmentType: "add",
                          });
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-600">No inventory data found</p>
          </div>
        )}

        {/* Stock Adjustment Modal */}
        {showAdjustmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Adjust Stock
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Product *</label>
                  <select
                    {...register("productId", { required: "Product is required" })}
                    className="input"
                    defaultValue={selectedProduct || ""}
                  >
                    <option value="">Select product</option>
                    {products?.map((product: any) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku}) - Current: {product.stockLevel}{" "}
                        {product.unitOfMeasure}
                      </option>
                    ))}
                  </select>
                  {errors.productId && (
                    <p className="text-sm text-red-600">
                      {errors.productId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Adjustment Type *</label>
                  <select
                    {...register("adjustmentType", {
                      required: "Adjustment type is required",
                    })}
                    className="input"
                  >
                    <option value="add">Add Stock</option>
                    <option value="remove">Remove Stock</option>
                    <option value="set">Set Stock Level</option>
                  </select>
                </div>

                <div>
                  <label className="label">Quantity *</label>
                  <input
                    {...register("quantity", {
                      required: "Quantity is required",
                      valueAsNumber: true,
                      min: { value: 0.01, message: "Quantity must be positive" },
                    })}
                    type="number"
                    step="0.01"
                    className="input"
                  />
                  {errors.quantity && (
                    <p className="text-sm text-red-600">
                      {errors.quantity.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Reason *</label>
                  <select
                    {...register("reason", { required: "Reason is required" })}
                    className="input"
                  >
                    <option value="">Select reason</option>
                    <option value="Stock Receipt">Stock Receipt</option>
                    <option value="Stocktake Adjustment">
                      Stocktake Adjustment
                    </option>
                    <option value="Damage/Waste">Damage/Waste</option>
                    <option value="Customer Return">Customer Return</option>
                    <option value="Theft/Loss">Theft/Loss</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.reason && (
                    <p className="text-sm text-red-600">{errors.reason.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Reference (e.g., Invoice #)</label>
                  <input {...register("reference")} className="input" />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={adjustmentMutation.isLoading}
                    className="btn btn-primary flex-1"
                  >
                    {adjustmentMutation.isLoading ? "Adjusting..." : "Adjust Stock"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdjustmentModal(false);
                      setSelectedProduct(null);
                    }}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminInventory;
