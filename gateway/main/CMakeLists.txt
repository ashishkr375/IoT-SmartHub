idf_component_register(
    SRCS "app_main.cpp" "wifi.cpp" "mqtt.cpp" "bridge.cpp"
    INCLUDE_DIRS "."
    REQUIRES mqtt esp_wifi nvs_flash json
)
