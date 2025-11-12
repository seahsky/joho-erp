import { type NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import { useForm } from "react-hook-form";
import AdminLayout from "~/components/AdminLayout";
import { api } from "~/utils/api";

type ProductFormData = {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  basePrice: number;
  unitOfMeasure: string;
  reorderLevel: number;
};

const AdminProducts: NextPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: products, isLoading } = api.product.getAll.useQuery({});
  const { data: categories } = api.category.getAll.useQuery();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>();

  const createMutation = api.product.create.useMutation({
    onSuccess: () => {
      alert("Product created successfully!");
      setShowCreateModal(false);
      reset();
      void utils.product.getAll.invalidate();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateMutation = api.product.update.useMutation({
    onSuccess: () => {
      alert("Product updated successfully!");
      setEditingProduct(null);
      void utils.product.getAll.invalidate();
    },
  });

  const onSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate({
        id: editingProduct,
        ...data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>Products - Jimmy Beef ERP Admin</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <button
            onClick={() => {
              reset();
              setShowCreateModal(true);
              setEditingProduct(null);
            }}
            className="btn btn-primary"
          >
            Add Product
          </button>
        </div>

        {/* Products Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Loading products...</div>
          </div>
        ) : products && products.length > 0 ? (
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Base Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product: any) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${product.basePrice.toFixed(2)} / {product.unitOfMeasure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          product.stockStatus === "In Stock"
                            ? "text-green-600"
                            : product.stockStatus === "Low Stock"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {product.stockLevel} {product.unitOfMeasure}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          product.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-600 mb-4">No products found</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Add Your First Product
            </button>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">SKU *</label>
                    <input
                      {...register("sku", { required: "SKU is required" })}
                      className="input"
                    />
                    {errors.sku && (
                      <p className="text-sm text-red-600">{errors.sku.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Product Name *</label>
                    <input
                      {...register("name", { required: "Name is required" })}
                      className="input"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    {...register("description")}
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Category *</label>
                    <select
                      {...register("categoryId", {
                        required: "Category is required",
                      })}
                      className="input"
                    >
                      <option value="">Select category</option>
                      {categories?.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId && (
                      <p className="text-sm text-red-600">
                        {errors.categoryId.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Unit of Measure *</label>
                    <select {...register("unitOfMeasure")} className="input">
                      <option value="kg">Kilograms (kg)</option>
                      <option value="units">Units</option>
                      <option value="cartons">Cartons</option>
                      <option value="boxes">Boxes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Base Price ($ excl. GST) *</label>
                    <input
                      {...register("basePrice", {
                        required: "Price is required",
                        valueAsNumber: true,
                      })}
                      type="number"
                      step="0.01"
                      className="input"
                    />
                    {errors.basePrice && (
                      <p className="text-sm text-red-600">
                        {errors.basePrice.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Reorder Level</label>
                    <input
                      {...register("reorderLevel", { valueAsNumber: true })}
                      type="number"
                      defaultValue={0}
                      className="input"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="btn btn-primary flex-1"
                  >
                    {createMutation.isLoading || updateMutation.isLoading
                      ? "Saving..."
                      : editingProduct
                      ? "Update Product"
                      : "Create Product"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
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

export default AdminProducts;
