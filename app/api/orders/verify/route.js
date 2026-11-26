import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
    try {
        if (!process.env.PAYSTACK_SECRET_KEY) {
            console.error("Missing PAYSTACK_SECRET_KEY environment variable");
            return NextResponse.json({ error: "Payment service misconfigured" }, { status: 500 });
        }

        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized user" }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const reference = typeof body?.reference === "string" ? body.reference.trim() : "";

        if (!reference) {
            return NextResponse.json({ error: "Payment reference is required" }, { status: 400 });
        }

        const matchingOrders = await prisma.order.findMany({
            where: {
                paymentReference: reference,
                userId,
            },
        });

        if (matchingOrders.length === 0) {
            return NextResponse.json({ error: "No matching orders found for reference" }, { status: 404 });
        }

        if (matchingOrders.every((order) => order.isPaid)) {
            return NextResponse.json({
                message: "Order already verified",
                verified: true,
            }, { status: 200 });
        }

        const verifyRes = await axios.get(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                },
                timeout: 10000,
            }
        );

        const txData = verifyRes.data?.data;

        if (!txData || txData.status !== "success" || txData.reference !== reference) {
            return NextResponse.json(
                { error: `Payment not completed (status: ${txData?.status || "unknown"})` },
                { status: 400 }
            );
        }

        const expectedTotal = matchingOrders.reduce((sum, order) => sum + Number(order.total), 0);
        const expectedAmountInKobo = Math.round(expectedTotal * 100);

        if (Number(txData.amount) !== expectedAmountInKobo) {
            console.error("Amount mismatch on verify:", {
                reference,
                paid: txData.amount,
                expected: expectedAmountInKobo,
            });
            return NextResponse.json(
                { error: "Paid amount does not match order total" },
                { status: 400 }
            );
        }

        await prisma.$transaction([
            prisma.order.updateMany({
                where: {
                    paymentReference: reference,
                    userId,
                    isPaid: false,
                },
                data: {
                    isPaid: true,
                    status: "ORDER_PLACED",
                },
            }),
            prisma.user.update({
                where: { id: userId },
                data: { cart: {} },
            }),
        ]);

        return NextResponse.json({
            message: "Payment verified and order confirmed",
            verified: true,
        }, { status: 200 });

    } catch (error) {
        console.error("Order verification failed:", error?.response?.data || error);
        return NextResponse.json(
            { error: "Unable to verify payment at this moment" },
            { status: 500 }
        );
    }
}