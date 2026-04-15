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

    const devices = await Device.find()
      .sort({ timestamp: -1 })
      .limit(100);

    return NextResponse.json(devices);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}
