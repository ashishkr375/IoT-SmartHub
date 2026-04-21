import { connectDB } from "@/lib/db";
import { Device } from "@/lib/models";
import { NextResponse } from "next/server";

function getLiveStatus(timestamp: Date | string) {
  const age = Date.now() - new Date(timestamp).getTime();
  if (age < 60000) return "online";
  if (age < 300000) return "idle";
  return "offline";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const device_id = searchParams.get("device_id");

    if (!device_id) {
      return NextResponse.json(
        { error: "device_id parameter required" },
        { status: 400 }
      );
    }

    await connectDB();

    const latest = await Device.findOne({ device_id }).sort({ timestamp: -1 });

    if (!latest) {
      return NextResponse.json(
        { error: `No history found for device ${device_id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      _id: latest._id,
      device_id: latest.device_id,
      data: latest.data,
      timestamp: latest.timestamp,
      status: getLiveStatus(latest.timestamp)
    });
  } catch (error) {
    console.error("Status fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch device status" },
      { status: 500 }
    );
  }
}