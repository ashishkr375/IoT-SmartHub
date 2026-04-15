#ifndef BRIDGE_H
#define BRIDGE_H

void matter_bridge_init();
void start_commissioning();
void send_raw_update(const char* device_id, const char* raw_json);

#endif
