import { type NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import AdminLayout from "~/components/AdminLayout";
import { api } from "~/utils/api";

const AdminCustomers: NextPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "">("");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [creditLimit, setCreditLimit] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  const utils = api.useUtils();

  const { data: customers, isLoading } = api.customer.getAll.useQuery({
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const approveMutation = api.customer.approveCredit.useMutation({
    onSuccess: () => {
      alert("Customer approved successfully!");
      setSelectedCustomer(null);
      void utils.customer.getAll.invalidate();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const rejectMutation = api.customer.rejectCredit.useMutation({
    onSuccess: () => {
      alert("Customer application rejected");
      setSelectedCustomer(null);
      void utils.customer.getAll.invalidate();
    },
  });

  const handleApprove = (customerId: string) => {
    const limit = parseFloat(creditLimit);
    if (!limit || limit <= 0) {
      alert("Please enter a valid credit limit");
      return;
    }
    if (!paymentTerms) {
      alert("Please enter payment terms");
      return;
    }

    approveMutation.mutate({
      id: customerId,
      creditLimit: limit,
      paymentTerms,
    });
  };

  const handleReject = (customerId: string) => {
    const reason = prompt("Please enter rejection reason:");
    if (!reason) return;

    rejectMutation.mutate({
      id: customerId,
      reason,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-blue-100 text-blue-800";
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "SUSPENDED":
        return "bg-red-100 text-red-800";
      case "REJECTED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>Customers - Jimmy Beef ERP Admin</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Search</label>
              <input
                type="text"
                placeholder="Search by name, email, ABN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Loading customers...</div>
          </div>
        ) : customers && customers.length > 0 ? (
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.businessName}
                      </div>
                      <div className="text-sm text-gray-500">
                        ABN: {customer.abn}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.contactPerson}
                      </div>
                      <div className="text-sm text-gray-500">
                        {customer.user.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {customer.user.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.deliverySuburb}, {customer.deliveryState}
                      </div>
                      <div className="text-sm text-gray-500">
                        Area: {customer.deliveryArea || "Not set"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          customer.status
                        )}`}
                      >
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.creditLimit
                        ? `$${customer.creditLimit.toLocaleString()}`
                        : customer.requestedCreditLimit
                        ? `Requested: $${customer.requestedCreditLimit.toLocaleString()}`
                        : "Not set"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {customer.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer.id);
                              setCreditLimit(
                                customer.requestedCreditLimit?.toString() || ""
                              );
                              setPaymentTerms("30 days");
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(customer.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-600">No customers found</p>
          </div>
        )}

        {/* Approval Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Approve Customer Credit
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Credit Limit ($)</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="input"
                    placeholder="Enter credit limit"
                  />
                </div>
                <div>
                  <label className="label">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="input"
                  >
                    <option value="">Select payment terms</option>
                    <option value="7 days">7 days</option>
                    <option value="14 days">14 days</option>
                    <option value="30 days">30 days</option>
                    <option value="60 days">60 days</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleApprove(selectedCustomer)}
                  disabled={approveMutation.isLoading}
                  className="btn btn-success flex-1"
                >
                  {approveMutation.isLoading ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCustomers;
