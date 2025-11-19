import { z } from 'zod';
import { router, isAdminOrSales } from '../trpc';
import { prisma } from '@jimmy-beef/database';
import { TRPCError } from '@trpc/server';

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
