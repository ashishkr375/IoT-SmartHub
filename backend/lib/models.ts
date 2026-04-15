import mongoose from "mongoose";

const DeviceSchema = new mongoose.Schema({
  device_id: { type: String, required: true, index: true },
  data: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now, index: true }
});

const CommandSchema = new mongoose.Schema({
  device_id: { type: String, required: true, index: true },
  command: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ["pending", "delivered", "executed"], default: "pending", index: true },
  created_at: { type: Date, default: Date.now, index: true },
  delivered_at: Date,
  executed_at: Date
});

export const Device =
  mongoose.models.Device || mongoose.model("Device", DeviceSchema);

export const Command =
  mongoose.models.Command || mongoose.model("Command", CommandSchema);
