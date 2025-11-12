import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";

export const inventoryRouter = createTRPCRouter({
  // Get stock levels overview
  getStockLevels: adminProcedure
    .input(
      z.object({
        categoryId: z.string().optional(),
        stockStatus: z.enum(["all", "low", "out"]).optional().default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const products = await ctx.db.product.findMany({
        where: {
          ...(input.categoryId && { categoryId: input.categoryId }),
          ...(input.stockStatus === "low" && {
            stockLevel: { lte: ctx.db.product.fields.reorderLevel },
            NOT: { stockLevel: 0 },
          }),
          ...(input.stockStatus === "out" && { stockLevel: 0 }),
        },
        include: {
          category: true,
        },
        orderBy: { name: "asc" },
      });

      const stockData = products.map((product: any) => ({
        ...product,
        stockStatus:
          product.stockLevel === 0
            ? "Out of Stock"
            : product.stockLevel <= product.reorderLevel
            ? "Low Stock"
            : "In Stock",
      }));

      return stockData;
    }),

  // Get stock movements history
  getStockMovements: adminProcedure
    .input(
      z.object({
        productId: z.string().optional(),
        movementType: z.enum(["RECEIPT", "ADJUSTMENT", "ORDER_FULFILLMENT", "RETURN"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const movements = await ctx.db.stockMovement.findMany({
        where: {
          ...(input.productId && { productId: input.productId }),
          ...(input.movementType && { movementType: input.movementType }),
          ...(input.startDate && { createdAt: { gte: input.startDate } }),
          ...(input.endDate && { createdAt: { lte: input.endDate } }),
        },
        include: {
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
          performedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return movements;
    }),

  // Create stock adjustment
  createAdjustment: adminProcedure
    .input(
      z.object({
        productId: z.string(),
        adjustmentType: z.enum(["add", "remove", "set"]),
        quantity: z.number().positive(),
        reason: z.string().min(1),
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      const previousStock = product.stockLevel;
      let newStock: number;
      let quantityChange: number;

      switch (input.adjustmentType) {
        case "add":
          newStock = previousStock + input.quantity;
          quantityChange = input.quantity;
          break;
        case "remove":
          newStock = Math.max(0, previousStock - input.quantity);
          quantityChange = -input.quantity;
          break;
        case "set":
          newStock = input.quantity;
          quantityChange = input.quantity - previousStock;
          break;
      }

      // Update product stock
      await ctx.db.product.update({
        where: { id: input.productId },
        data: { stockLevel: newStock },
      });

      // Create stock movement record
      const movement = await ctx.db.stockMovement.create({
        data: {
          productId: input.productId,
          movementType: "ADJUSTMENT",
          quantity: quantityChange,
          previousStock,
          newStock,
          reason: `${input.reason}${input.notes ? ` - ${input.notes}` : ""}`,
          reference: input.reference,
          performedBy: user.id,
        },
      });

      return movement;
    }),

  // Receive stock from supplier
  receiveStock: adminProcedure
    .input(
      z.object({
        supplierName: z.string().optional(),
        invoiceNumber: z.string().optional(),
        receivedDate: z.date().optional(),
        items: z.array(
          z.object({
            productId: z.string(),
            quantity: z.number().positive(),
            unitCost: z.number().positive().optional(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const movements = [];

      for (const item of input.items) {
        const product = await ctx.db.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Product ${item.productId} not found`,
          });
        }

        const previousStock = product.stockLevel;
        const newStock = previousStock + item.quantity;

        // Update product stock
        await ctx.db.product.update({
          where: { id: item.productId },
          data: { stockLevel: newStock },
        });

        // Create stock movement record
        const movement = await ctx.db.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: "RECEIPT",
            quantity: item.quantity,
            previousStock,
            newStock,
            reason: `Stock receipt from ${input.supplierName || "supplier"}`,
            reference: input.invoiceNumber,
            performedBy: user.id,
          },
        });

        movements.push(movement);
      }

      return movements;
    }),

  // Get low stock alerts
  getLowStockAlerts: adminProcedure.query(async ({ ctx }) => {
    const products = await ctx.db.product.findMany({
      where: {
        status: "active",
        stockLevel: {
          lte: ctx.db.product.fields.reorderLevel,
        },
      },
      include: {
        category: true,
      },
      orderBy: { stockLevel: "asc" },
    });

    return products;
  }),
});
