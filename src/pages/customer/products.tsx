import { type NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import CustomerLayout from "~/components/CustomerLayout";
import { api } from "~/utils/api";

const CustomerProducts: NextPage = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const { data: products, isLoading } = api.product.getAll.useQuery({
    search: search || undefined,
    categoryId: categoryFilter || undefined,
    inStockOnly: true,
  });

  const { data: categories } = api.category.getAll.useQuery();

  const addToCartMutation = api.cart.addItem.useMutation({
    onSuccess: () => {
      alert("Product added to cart!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleAddToCart = (productId: string) => {
    addToCartMutation.mutate({ productId, quantity: 1 });
  };

  return (
    <CustomerLayout>
      <Head>
        <title>Products - Jimmy Beef ERP</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-2 text-sm text-gray-600">
            Browse and order our products
          </p>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Search</label>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input"
              >
                <option value="">All Categories</option>
                {categories?.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Loading products...</div>
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product: any) => (
              <div key={product.id} className="card">
                <div className="aspect-square w-full bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                  {product.imageUrls[0] ? (
                    <img
                      src={product.imageUrls[0]}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-gray-400">No image</span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{product.sku}</p>
                {product.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {product.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      ${product.displayPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      per {product.unitOfMeasure}
                      {product.gstApplicable && " (excl. GST)"}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        product.stockStatus === "In Stock"
                          ? "bg-green-100 text-green-800"
                          : product.stockStatus === "Low Stock"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.stockStatus}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleAddToCart(product.id)}
                  disabled={product.stockStatus === "Out of Stock" || addToCartMutation.isLoading}
                  className="btn btn-primary w-full mt-4"
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No products found</p>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default CustomerProducts;
