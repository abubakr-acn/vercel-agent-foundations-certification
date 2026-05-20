import {
    tool,
    ToolLoopAgent,
    type InferAgentUIMessage,
    type UIToolInvocation,
} from "ai";
import { z } from "zod";
import { ApiRequestError, getProducts, getCategories, getProductById } from "@/lib/api";

export type ShoppingAgentUIMessage = InferAgentUIMessage<typeof shoppingAgent>;
export type ProductDetailsToolInvocation = UIToolInvocation<typeof getProductDetails>;
export type SearchProductsToolInvocation = UIToolInvocation<typeof searchProducts>;

const getProductDetails = tool({
    description: `Get detailed information about a specific product in the Vercel swag store. Use this when the user asks for more information about a specific product, e.g. "Tell me more about the Vercel hoodie".`,
    inputSchema: z.object({
        productId: z.string().describe(`The unique ID of the product to retrieve details for.`),
    }),
    execute: async ({ productId }) => {
        try {
            const product = await getProductById(productId);
            return {
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                currency: product.currency,
                category: product.category,
                description: product.description,
                images: product.images,
                tags: product.tags,
            };
        } catch (err) {
            const message =
                err instanceof ApiRequestError ? err.message : "Unknown error";
            return { error: message };
        }
    },
});

const getAllCategories = tool({
    description: `List every product category available in the Vercel swag store, along with the number of products in each. Use this when the user asks what categories exist, what kinds of products are sold, or wants to browse the store at a high level.`,
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const categories = await getCategories();
            return {
                count: categories.length,
                categories: categories.map((c) => ({
                    slug: c.slug,
                    name: c.name,
                    productCount: c.productCount,
                })),
            };
        } catch (err) {
            const message =
                err instanceof ApiRequestError ? err.message : "Unknown error";
            return { count: 0, categories: [], error: message };
        }
    },
});

const searchProducts = tool({
    description: `Search the Vercel swag store product catalog. Use this whenever the user asks about products, what the store sells, or wants recommendations. Optionally narrow results to a single category.`,
    inputSchema: z.object({
        query: z
            .string()
            .optional()
            .describe(
                `Optional, free-text search terms describing what the user is looking for, e.g. 'hoodie' or 'water bottle'.`,
            ),
        category: z
            .string()
            .optional()
            .describe(
                `Optional category slug to filter results. Only set this when the user clearly wants a specific category. Use the getAllCategories tool to get all valid categories.`,
            ),
    }),
    execute: async ({ query, category }) => {
        try {
            const products = await getProducts({
                search: query,
                category,
                limit: 10,
            });
            return {
                count: products.length,
                products: products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    price: p.price,
                    currency: p.currency,
                    category: p.category,
                    description: p.description,
                    images: p.images,
                })),
            };
        } catch (err) {
            const message =
                err instanceof ApiRequestError ? err.message : "Unknown error";
            return { count: 0, products: [], error: message };
        }
    },
});

export const shoppingAgent = new ToolLoopAgent({
    model: "anthropic/claude-sonnet-4.6",
    instructions: `You are a friendly shopping assistant for the Vercel swag store.
    If the user asks about a specific product, use the getProductDetails tool to retrieve information about it.
    `,
    tools: { searchProducts, getAllCategories, getProductDetails },
});