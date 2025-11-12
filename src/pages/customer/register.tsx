import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "~/utils/api";

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  abn: string;
  contactPerson: string;
  phone: string;
  businessStreet: string;
  businessSuburb: string;
  businessState: string;
  businessPostcode: string;
  deliveryStreet: string;
  deliverySuburb: string;
  deliveryState: string;
  deliveryPostcode: string;
  sameAsBusinessAddress: boolean;
};

const Register: NextPage = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const sameAsBusinessAddress = watch("sameAsBusinessAddress");
  const businessStreet = watch("businessStreet");
  const businessSuburb = watch("businessSuburb");
  const businessState = watch("businessState");
  const businessPostcode = watch("businessPostcode");

  const registerMutation = api.auth.register.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        void router.push("/customer/login");
      }, 3000);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const deliveryAddress = data.sameAsBusinessAddress
      ? {
          deliveryStreet: data.businessStreet,
          deliverySuburb: data.businessSuburb,
          deliveryState: data.businessState,
          deliveryPostcode: data.businessPostcode,
        }
      : {
          deliveryStreet: data.deliveryStreet,
          deliverySuburb: data.deliverySuburb,
          deliveryState: data.deliveryState,
          deliveryPostcode: data.deliveryPostcode,
        };

    registerMutation.mutate({
      email: data.email,
      password: data.password,
      businessName: data.businessName,
      abn: data.abn,
      contactPerson: data.contactPerson,
      phone: data.phone,
      businessStreet: data.businessStreet,
      businessSuburb: data.businessSuburb,
      businessState: data.businessState,
      businessPostcode: data.businessPostcode,
      ...deliveryAddress,
    });
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="card max-w-md text-center">
          <h2 className="mb-4 text-2xl font-bold text-green-600">
            Registration Successful!
          </h2>
          <p className="text-gray-600">
            Your account has been created and is pending approval. We'll notify
            you via email once your account is approved.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Customer Registration - Jimmy Beef ERP</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Customer Registration
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/customer/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </p>
          </div>
          <form className="card mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Business Information
              </h3>

              <div>
                <label htmlFor="businessName" className="label">
                  Business Name *
                </label>
                <input
                  {...register("businessName", {
                    required: "Business name is required",
                  })}
                  type="text"
                  className="input"
                />
                {errors.businessName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.businessName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="abn" className="label">
                  ABN *
                </label>
                <input
                  {...register("abn", {
                    required: "ABN is required",
                    pattern: {
                      value: /^\d{11}$/,
                      message: "ABN must be 11 digits",
                    },
                  })}
                  type="text"
                  maxLength={11}
                  className="input"
                />
                {errors.abn && (
                  <p className="mt-1 text-sm text-red-600">{errors.abn.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contactPerson" className="label">
                    Contact Person *
                  </label>
                  <input
                    {...register("contactPerson", {
                      required: "Contact person is required",
                    })}
                    type="text"
                    className="input"
                  />
                  {errors.contactPerson && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.contactPerson.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="label">
                    Phone *
                  </label>
                  <input
                    {...register("phone", { required: "Phone is required" })}
                    type="tel"
                    className="input"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="label">
                  Email Address *
                </label>
                <input
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                  type="email"
                  className="input"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="password" className="label">
                    Password *
                  </label>
                  <input
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                    })}
                    type="password"
                    className="input"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label">
                    Confirm Password *
                  </label>
                  <input
                    {...register("confirmPassword", {
                      required: "Please confirm password",
                    })}
                    type="password"
                    className="input"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Business Address
              </h3>

              <div>
                <label htmlFor="businessStreet" className="label">
                  Street Address *
                </label>
                <input
                  {...register("businessStreet", {
                    required: "Street address is required",
                  })}
                  type="text"
                  className="input"
                />
                {errors.businessStreet && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.businessStreet.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="businessSuburb" className="label">
                    Suburb *
                  </label>
                  <input
                    {...register("businessSuburb", {
                      required: "Suburb is required",
                    })}
                    type="text"
                    className="input"
                  />
                  {errors.businessSuburb && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.businessSuburb.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="businessState" className="label">
                    State *
                  </label>
                  <select {...register("businessState")} className="input">
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

                <div>
                  <label htmlFor="businessPostcode" className="label">
                    Postcode *
                  </label>
                  <input
                    {...register("businessPostcode", {
                      required: "Postcode is required",
                    })}
                    type="text"
                    maxLength={4}
                    className="input"
                  />
                  {errors.businessPostcode && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.businessPostcode.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  {...register("sameAsBusinessAddress")}
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="sameAsBusinessAddress"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Delivery address same as business address
                </label>
              </div>

              {!sameAsBusinessAddress && (
                <>
                  <h3 className="text-lg font-medium text-gray-900">
                    Delivery Address
                  </h3>

                  <div>
                    <label htmlFor="deliveryStreet" className="label">
                      Street Address *
                    </label>
                    <input
                      {...register("deliveryStreet", {
                        required: !sameAsBusinessAddress && "Street address is required",
                      })}
                      type="text"
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="deliverySuburb" className="label">
                        Suburb *
                      </label>
                      <input
                        {...register("deliverySuburb", {
                          required: !sameAsBusinessAddress && "Suburb is required",
                        })}
                        type="text"
                        className="input"
                      />
                    </div>

                    <div>
                      <label htmlFor="deliveryState" className="label">
                        State *
                      </label>
                      <select {...register("deliveryState")} className="input">
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

                    <div>
                      <label htmlFor="deliveryPostcode" className="label">
                        Postcode *
                      </label>
                      <input
                        {...register("deliveryPostcode", {
                          required: !sameAsBusinessAddress && "Postcode is required",
                        })}
                        type="text"
                        maxLength={4}
                        className="input"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={registerMutation.isLoading}
                className="btn btn-primary w-full"
              >
                {registerMutation.isLoading ? "Registering..." : "Register"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Register;
