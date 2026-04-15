#include "bridge.h"
#include "mqtt.h"
#include "esp_log.h"
#include <stdio.h>

static const char *TAG = "BRIDGE";

void matter_bridge_init() {
    ESP_LOGI(TAG, "Initializing Matter bridge");
    
    // Initialize Matter/CHIP stack
    // chip::Platform::MemoryInit();
    // chip::DeviceLayer::PlatformMgr().InitChipStack();
    // chip::Controller::DeviceControllerFactory::GetInstance().Init();
    
    ESP_LOGI(TAG, "Matter bridge initialized");
}

void start_commissioning() {
    ESP_LOGI(TAG, "Starting commissioning window");
    
    // Open commissioning window for 300 seconds
    // chip::DeviceLayer::PlatformMgr().ScheduleWork([](intptr_t) {
    //     auto & mgr = chip::Controller::CommissioningWindowManager::GetInstance();
    //     mgr.OpenBasicCommissioningWindow(300);
    // });
}

void send_raw_update(const char* device_id, const char* raw_json) {
    char payload[512];
    
    snprintf(payload, sizeof(payload),
        "{\"device_id\":\"%s\",\"data\":%s}",
        device_id, raw_json);
    
    mqtt_publish("device/update", payload);
    
    ESP_LOGI(TAG, "Sent update for device: %s", device_id);
}
