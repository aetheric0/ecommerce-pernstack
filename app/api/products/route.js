import { prisma, withDbRetry } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const storeId = new URL(request.url).searchParams.get('storeId');
        const products = await withDbRetry(() =>
            prisma.product.findMany({
                where: {
                inStock: true,
                ...(storeId ? { storeId } : {}),
                store: {
                    is: {
                    isActive: true,
                    },
                },
                },
                orderBy: { createdAt: 'desc' },
                include: {
                rating: {
                    select: {
                    createdAt: true,
                    rating: true,
                    review: true,
                    user: {
                        select: {
                        name: true,
                        image: true,
                        },
                    },
                    },
                },
                store: {
                    select: {
                    isActive: true,
                    name: true,
                    username: true,
                    logo: true,
                    },
                },
                },
            })
            );

        return NextResponse.json(
            { message: 'product fetched successfully', products },
            { status: 200 }
        );
    } catch (error) {
        console.error('Failed to fetch product:', error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
