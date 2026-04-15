#include "mqtt.h"
#include "mqtt_client.h"
#include "esp_log.h"
#include "cJSON.h"

static const char *TAG = "MQTT";
static esp_mqtt_client_handle_t client;

void handle_command(char* json) {
    cJSON *root = cJSON_Parse(json);
    if (!root) {
        ESP_LOGE(TAG, "Invalid JSON");
        return;
    }

    cJSON *device_id_item = cJSON_GetObjectItem(root, "device_id");
    cJSON *cmd = cJSON_GetObjectItem(root, "command");
    
    if (device_id_item && cmd) {
        const char *device_id = device_id_item->valuestring;
        ESP_LOGI(TAG, "Command for device: %s", device_id);
        
        // TODO: Map to Matter command based on device type
    }

    cJSON_Delete(root);
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base,
                               int32_t event_id, void *event_data) {
    esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t) event_data;

    switch (event->event_id) {
        case MQTT_EVENT_CONNECTED:
            ESP_LOGI(TAG, "MQTT Connected");
            esp_mqtt_client_subscribe(client, "device/command", 0);
            break;
            
        case MQTT_EVENT_DATA:
            ESP_LOGI(TAG, "MQTT Data received");
            char buffer[512];
            int len = event->data_len < 511 ? event->data_len : 511;
            memcpy(buffer, event->data, len);
            buffer[len] = '\0';
            handle_command(buffer);
            break;
            
        default:
            break;
    }
}

void mqtt_app_start() {
    esp_mqtt_client_config_t config = {};
    config.broker.address.uri = "mqtt://YOUR_SERVER_IP";

    client = esp_mqtt_client_init(&config);
    esp_mqtt_client_register_event(client, (esp_mqtt_event_id_t)ESP_EVENT_ANY_ID, 
                                   mqtt_event_handler, NULL);
    esp_mqtt_client_start(client);
    
    ESP_LOGI(TAG, "MQTT started");
}

void mqtt_publish(const char* topic, const char* data) {
    esp_mqtt_client_publish(client, topic, data, 0, 1, 0);
}
