//add new address

import { prisma, withDbRetry } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request){
    try {
        const {userId} = await auth()
        if (!userId) {                            
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        const body = await request.json()
        const {address} = body
        if(!address){
            return NextResponse.json({error: 'missing address payload'}, {status: 400})
        }
        const newAddress = await withDbRetry(() => prisma.address.create({
            data: {...address, userId}
        }))
        return NextResponse.json({message: 'Address added successfully', newAddress}, {status: 201} )
        
    } catch (error) {
    console.error('Failed to fetch address', error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
        
    }
}




//get all addresses 
export async function GET(request){
    try {
        const {userId} = await auth()
        if (!userId) {                            
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
     
        const newAddress = await withDbRetry(() => prisma.address.findMany({
            where: { userId }
        }))

        return NextResponse.json({message: 'Address fetched successfully', newAddress}, {status: 200} )
        
    } catch (error) {
    console.error('Failed to fetch address', error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
        
    }
}


