import { connectDB } from "@/lib/db";
import { Device } from "@/lib/models";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { device_id, data } = body;

    if (!device_id || !data) {
      return NextResponse.json(
        { error: "device_id and data are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Store device update
    await Device.create({
      device_id,
      data,
      timestamp: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Device update error:", error);
    return NextResponse.json(
      { error: "Failed to store device update" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    // Get the latest record for each unique device_id using aggregation
    const devices = await Device.aggregate([
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: "$device_id",
          device_id: { $first: "$device_id" },
          data: { $first: "$data" },
          timestamp: { $first: "$timestamp" },
          doc_id: { $first: "$_id" }
        }
      },
      {
        $project: {
          _id: "$doc_id",
          device_id: 1,
          data: 1,
          timestamp: 1
        }
      },
      {
        $sort: { timestamp: -1 }
      }
    ]);

    return NextResponse.json(devices);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}
