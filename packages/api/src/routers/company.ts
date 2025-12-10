import { z } from 'zod';
import { router, isAdminOrSales } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import * as xeroService from '../services/xero';

export const companyRouter = router({
  /**
   * Get company settings including delivery configuration
   */
  getSettings: isAdminOrSales.query(async () => {
    const company = await prisma.company.findFirst({
      select: {
        id: true,
        businessName: true,
        abn: true,
        address: true,
        contactPerson: true,
        bankDetails: true,
        xeroSettings: true,
        deliverySettings: true,
        notificationSettings: true,
        logoUrl: true,
      },
    });

    if (!company) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Company settings not found. Please create company profile first.',
      });
    }

    return company;
  }),

  /**
   * Update company profile (business info, address, bank details)
   */
  updateProfile: isAdminOrSales
    .input(
      z.object({
        businessName: z.string().min(1, 'Business name is required'),
        abn: z.string().min(11, 'Valid ABN is required'),
        address: z.object({
          street: z.string().min(1, 'Street address is required'),
          suburb: z.string().min(1, 'Suburb is required'),
          state: z.string().min(1, 'State is required'),
          postcode: z.string().min(4, 'Valid postcode is required'),
          country: z.string().default('Australia'),
        }),
        contactPerson: z.object({
          firstName: z.string().min(1, 'First name is required'),
          lastName: z.string().min(1, 'Last name is required'),
          email: z.string().email('Valid email is required'),
          phone: z.string().min(1, 'Phone is required'),
          mobile: z.string().optional(),
        }),
        bankDetails: z.object({
          bankName: z.string().min(1, 'Bank name is required'),
          accountName: z.string().min(1, 'Account name is required'),
          bsb: z.string().min(6, 'Valid BSB is required'),
          accountNumber: z.string().min(1, 'Account number is required'),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const company = await prisma.company.findFirst();

      if (!company) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Company not found',
        });
      }

      const updated = await prisma.company.update({
        where: { id: company.id },
        data: {
          businessName: input.businessName,
          abn: input.abn,
          address: input.address,
          contactPerson: input.contactPerson,
          bankDetails: input.bankDetails || null,
        },
      });

      return {
        success: true,
        message: 'Company profile updated successfully',
        company: updated,
      };
    }),

  /**
   * Update logo URL
   */
  updateLogo: isAdminOrSales
    .input(
      z.object({
        logoUrl: z.string().url('Valid URL is required'),
      })
    )
    .mutation(async ({ input }) => {
      const company = await prisma.company.findFirst();

      if (!company) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Company not found',
        });
      }

      const updated = await prisma.company.update({
        where: { id: company.id },
        data: {
          logoUrl: input.logoUrl,
        },
      });

      return {
        success: true,
        message: 'Company logo updated successfully',
        logoUrl: updated.logoUrl,
      };
    }),

  /**
   * Update Xero integration settings
   */
  updateXeroSettings: isAdminOrSales
    .input(
      z.object({
        clientId: z.string().min(1, 'Client ID is required'),
        clientSecret: z.string().min(1, 'Client Secret is required'),
        tenantId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const company = await prisma.company.findFirst();

      if (!company) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Company not found',
        });
      }

      const updated = await prisma.company.update({
        where: { id: company.id },
        data: {
          xeroSettings: {
            clientId: input.clientId,
            clientSecret: input.clientSecret,
            tenantId: input.tenantId || null,
          },
        },
      });

      return {
        success: true,
        message: 'Xero settings updated successfully',
        settings: updated.xeroSettings,
      };
    }),

  /**
   * Test Xero connection
   */
  testXeroConnection: isAdminOrSales.mutation(async () => {
    const company = await prisma.company.findFirst();

    if (!company || !company.xeroSettings) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Xero settings not configured',
      });
    }

    // Test the actual Xero connection
    const result = await xeroService.testConnection();

    return {
      success: result.success,
      message: result.message,
      connected: result.success,
      tenantName: result.tenantName,
    };
  }),

  /**
   * Get Xero connection status
   */
  getXeroStatus: isAdminOrSales.query(async () => {
    const status = await xeroService.getConnectionStatus();

    return {
      connected: status.connected,
      tenantId: status.tenantId,
      tokenExpiry: status.tokenExpiry,
      needsRefresh: status.needsRefresh,
    };
  }),

  /**
   * Disconnect from Xero
   */
  disconnectXero: isAdminOrSales.mutation(async () => {
    try {
      await xeroService.disconnect();

      return {
        success: true,
        message: 'Successfully disconnected from Xero',
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to disconnect from Xero',
      });
    }
  }),

  /**
   * Update delivery settings (warehouse address, Mapbox token, cut-off times)
   */
  updateDeliverySettings: isAdminOrSales
    .input(
      z.object({
        warehouseAddress: z.object({
          street: z.string().min(1, 'Street address is required'),
          suburb: z.string().min(1, 'Suburb is required'),
          state: z.string().min(1, 'State is required'),
          postcode: z.string().min(4, 'Valid postcode is required'),
          country: z.string().default('Australia'),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        }),
        orderCutoffTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)').default('14:00'),
        cutoffByArea: z.record(z.string()).optional(),
        defaultDeliveryWindow: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get existing company
      const company = await prisma.company.findFirst();

      if (!company) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Company not found',
        });
      }

      // Update company with delivery settings
      const updated = await prisma.company.update({
        where: { id: company.id },
        data: {
          deliverySettings: {
            warehouseAddress: input.warehouseAddress,
            orderCutoffTime: input.orderCutoffTime,
            cutoffByArea: input.cutoffByArea || null,
            defaultDeliveryWindow: input.defaultDeliveryWindow || null,
          },
        },
      });

      return {
        success: true,
        message: 'Delivery settings updated successfully',
        settings: updated.deliverySettings,
      };
    }),

  /**
   * Geocode an address using Mapbox
   */
  geocodeAddress: isAdminOrSales
    .input(
      z.object({
        address: z.string().min(1, 'Address is required'),
      })
    )
    .mutation(async ({ input }) => {
      // Get token from environment variable
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

      if (!token) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Mapbox access token not configured',
        });
      }

      try {
        const encodedAddress = encodeURIComponent(input.address);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&country=AU&limit=5`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Geocoding request failed');
        }

        const data = await response.json();

        if (!data.features || data.features.length === 0) {
          throw new Error('No results found for this address');
        }

        // Return formatted results
        return {
          success: true,
          results: data.features.map((feature: any) => ({
            address: feature.place_name,
            latitude: feature.center[1],
            longitude: feature.center[0],
            relevance: feature.relevance,
          })),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Geocoding failed',
        });
      }
    }),
});
