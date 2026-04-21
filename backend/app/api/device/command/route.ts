import { connectDB } from "@/lib/db";
import { Command } from "@/lib/models";
import { NextResponse } from "next/server";

// POST - Queue a command for a device
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { device_id, command } = body;

    if (!device_id || !command) {
      return NextResponse.json(
        { error: "device_id and command are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Store command for gateway to poll
    await Command.create({
      device_id,
      command,
      status: "pending",
      created_at: new Date()
    });

    console.log(`Command queued for device: ${device_id}`);

    return NextResponse.json({ success: true, message: "Command queued" });
  } catch (error) {
    console.error("Command error:", error);
    return NextResponse.json(
      { error: "Failed to queue command" },
      { status: 500 }
    );
  }
}

// GET - Gateway polls for pending commands
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

    // Gateway polls all commands; devices can poll only their own.
    const isGatewayPoll = device_id.toLowerCase().includes("gateway");
    const filter = isGatewayPoll
      ? { status: "pending" }
      : { device_id, status: "pending" };

    const commands = await Command.find(filter)
      .sort({ created_at: 1 })
      .limit(10);

    // Mark commands as delivered
    if (commands.length > 0) {
      const commandIds = commands.map(cmd => cmd._id);
      await Command.updateMany(
        { _id: { $in: commandIds } },
        { status: "delivered", delivered_at: new Date() }
      );
    }

    return NextResponse.json(commands);
  } catch (error) {
    console.error("Command fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch commands" },
      { status: 500 }
    );
  }
}
