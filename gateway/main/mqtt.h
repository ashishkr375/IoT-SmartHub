#ifndef MQTT_H
#define MQTT_H

void mqtt_app_start();
void mqtt_publish(const char* topic, const char* data);
void handle_command(char* json);

#endif
