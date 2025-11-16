'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from '@jimmy-beef/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/trpc/client';

export default function NewCustomerPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCustomerMutation = api.customer.createCustomer.useMutation({
    onSuccess: () => {
      router.push('/customers');
    },
  });

  const [formData, setFormData] = useState({
    businessName: '',
    abn: '',
    contactPerson: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      mobile: '',
    },
    deliveryAddress: {
      street: '',
      suburb: '',
      state: 'NSW',
      postcode: '',
      areaTag: 'north' as 'north' | 'south' | 'east' | 'west',
      deliveryInstructions: '',
    },
    billingAddress: {
      street: '',
      suburb: '',
      state: 'NSW',
      postcode: '',
    },
    creditLimit: 0,
    paymentTerms: '',
  });

  const [useSameAddress, setUseSameAddress] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createCustomerMutation.mutateAsync({
        ...formData,
        billingAddress: useSameAddress ? undefined : formData.billingAddress,
      });
    } catch (error) {
      console.error('Error creating customer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="mb-6">
        <Link href="/customers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
        <h1 className="text-2xl md:text-4xl font-bold">Add New Customer</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
          Create a new customer account
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Enter the customer&apos;s business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abn">ABN *</Label>
                  <Input
                    id="abn"
                    required
                    maxLength={11}
                    value={formData.abn}
                    onChange={(e) => setFormData({ ...formData, abn: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Person */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Person</CardTitle>
              <CardDescription>Primary contact for this customer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    required
                    value={formData.contactPerson.firstName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactPerson: { ...formData.contactPerson, firstName: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    required
                    value={formData.contactPerson.lastName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactPerson: { ...formData.contactPerson, lastName: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.contactPerson.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactPerson: { ...formData.contactPerson, email: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    required
                    value={formData.contactPerson.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactPerson: { ...formData.contactPerson, phone: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  value={formData.contactPerson.mobile}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactPerson: { ...formData.contactPerson, mobile: e.target.value },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Address</CardTitle>
              <CardDescription>Where orders will be delivered</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryStreet">Street Address *</Label>
                <Input
                  id="deliveryStreet"
                  required
                  value={formData.deliveryAddress.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryAddress: { ...formData.deliveryAddress, street: e.target.value },
                    })
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="deliverySuburb">Suburb *</Label>
                  <Input
                    id="deliverySuburb"
                    required
                    value={formData.deliveryAddress.suburb}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deliveryAddress: { ...formData.deliveryAddress, suburb: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryState">State *</Label>
                  <select
                    id="deliveryState"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.deliveryAddress.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deliveryAddress: { ...formData.deliveryAddress, state: e.target.value },
                      })
                    }
                    required
                  >
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="SA">SA</option>
                    <option value="WA">WA</option>
                    <option value="TAS">TAS</option>
                    <option value="NT">NT</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryPostcode">Postcode *</Label>
                  <Input
                    id="deliveryPostcode"
                    required
                    value={formData.deliveryAddress.postcode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deliveryAddress: { ...formData.deliveryAddress, postcode: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="areaTag">Delivery Area *</Label>
                <select
                  id="areaTag"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.deliveryAddress.areaTag}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryAddress: { ...formData.deliveryAddress, areaTag: e.target.value as 'north' | 'south' | 'east' | 'west' },
                    })
                  }
                  required
                >
                  <option value="north">North</option>
                  <option value="south">South</option>
                  <option value="east">East</option>
                  <option value="west">West</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
                <Input
                  id="deliveryInstructions"
                  value={formData.deliveryAddress.deliveryInstructions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryAddress: { ...formData.deliveryAddress, deliveryInstructions: e.target.value },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
              <CardDescription>Address for invoicing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sameAddress"
                  checked={useSameAddress}
                  onChange={(e) => setUseSameAddress(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="sameAddress" className="font-normal">
                  Same as delivery address
                </Label>
              </div>
              {!useSameAddress && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="billingStreet">Street Address *</Label>
                    <Input
                      id="billingStreet"
                      required={!useSameAddress}
                      value={formData.billingAddress.street}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          billingAddress: { ...formData.billingAddress, street: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="billingSuburb">Suburb *</Label>
                      <Input
                        id="billingSuburb"
                        required={!useSameAddress}
                        value={formData.billingAddress.suburb}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billingAddress: { ...formData.billingAddress, suburb: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billingState">State *</Label>
                      <select
                        id="billingState"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.billingAddress.state}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billingAddress: { ...formData.billingAddress, state: e.target.value },
                          })
                        }
                        required={!useSameAddress}
                      >
                        <option value="NSW">NSW</option>
                        <option value="VIC">VIC</option>
                        <option value="QLD">QLD</option>
                        <option value="SA">SA</option>
                        <option value="WA">WA</option>
                        <option value="TAS">TAS</option>
                        <option value="NT">NT</option>
                        <option value="ACT">ACT</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billingPostcode">Postcode *</Label>
                      <Input
                        id="billingPostcode"
                        required={!useSameAddress}
                        value={formData.billingAddress.postcode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billingAddress: { ...formData.billingAddress, postcode: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Credit Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Terms</CardTitle>
              <CardDescription>Set initial credit limit and payment terms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="creditLimit">Credit Limit ($)</Label>
                  <Input
                    id="creditLimit"
                    type="number"
                    min="0"
                    step="100"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Set to 0 for no credit approval</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input
                    id="paymentTerms"
                    placeholder="e.g., Net 30"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {createCustomerMutation.error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
              <p className="text-sm font-medium">Error creating customer</p>
              <p className="text-sm">{createCustomerMutation.error.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/customers">
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Customer
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
