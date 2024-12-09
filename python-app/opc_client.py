import asyncio
import os
from asyncua import Client
import paho.mqtt.client as mqtt
import json
from datetime import datetime

# MQTT Broker settings
MQTT_BROKER = "52.71.209.13"  # Change to your broker address
MQTT_PORT = 1883  # Change if needed
MQTT_TOPIC = "plant/data"

current_dir = os.path.dirname(os.path.abspath(__file__))
data_file = os.path.join(current_dir, 'plantdata.json')

def read_json_file(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data

async def read_plant_data(client, nsidx):
    param_data = read_json_file(data_file)
    param_data = param_data["Plant"]
    plant_data = {}
    for device in param_data["devices"]:  # Reading data from all the devices available
        plant_obj = device
        try:
            device_data = {}
            for key, value in param_data["device_data"][device].items():
                var = await client.nodes.root.get_child(
                    f"0:Objects/{nsidx}:PlantDevices/{nsidx}:{plant_obj}/{nsidx}:{key}")
                var_data = await var.read_value()
                device_data[key] = var_data
            # Store data in a dictionary
            current_time = datetime.now()  # Use utcnow() for UTC time
            # Format the timestamp as a string
            timestamp_str = current_time.strftime('%Y-%m-%dT%H:%M:%SZ')
            plant_data["system_name"] = param_data["name"]
            plant_data["time"] = timestamp_str
            plant_data[device] = device_data
        except Exception as e:
            print(f"Error reading data from {plant_obj}: {e}")

    return plant_data


def on_connect(client, userdata, flags, rc, properties):
    print("Connected to MQTT Broker with result code:", rc)


async def mqtt_publish(client, bioreactor_data):
    if bioreactor_data:
        client.publish(MQTT_TOPIC, json.dumps(bioreactor_data))
        print(f"Published to MQTT: {bioreactor_data}")


async def main():
    # Set up MQTT client
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client.on_connect = on_connect
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    mqtt_client.loop_start()  # Start the MQTT loop

    # Set up OPC UA client

    async with Client("opc.tcp://localhost:4840/freeopcua/server/") as opcua_client:
        try:
            nsidx = await opcua_client.get_namespace_index("Plant Simulation Server")
            print(nsidx)
            print("Connected to OPC UA Server")

            while True:
                plant_data = await read_plant_data(opcua_client, nsidx)
                print(plant_data)
                await mqtt_publish(mqtt_client, plant_data)
                await asyncio.sleep(10)  # Wait before the next read
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await opcua_client.disconnect()
            mqtt_client.loop_stop()  # Stop the MQTT loop


if __name__ == "__main__":
    asyncio.run(main())
