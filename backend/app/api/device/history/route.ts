import { connectDB } from "@/lib/db";
import { Device } from "@/lib/models";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const device_id = searchParams.get("device_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!device_id) {
      return NextResponse.json(
        { error: "device_id parameter required" },
        { status: 400 }
      );
    }

    await connectDB();

    const skip = (page - 1) * limit;

    const history = await Device.find({ device_id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(history);
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch device history" },
      { status: 500 }
    );
  }
}
