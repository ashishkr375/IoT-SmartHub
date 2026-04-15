#include "wifi.h"
#include "mqtt.h"
#include "bridge.h"

extern "C" void app_main() {
    wifi_init_sta();
    
    mqtt_app_start();
    
    matter_bridge_init();
    
    start_commissioning();
}
