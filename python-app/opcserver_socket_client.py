import asyncio
import os
import time
import logging
from asyncua import Server
import random
import json
import websockets


current_dir = os.path.dirname(os.path.abspath(__file__))
data_file = os.path.join(current_dir, 'plantdata.json')
logging.basicConfig(level=logging.INFO)


# Function to read JSON data from a file
def read_json_file(file_path):
    try:
        with open(file_path, 'r') as file:
            return json.load(file)
    except Exception as e:
        logging.error(f"Error reading JSON file: {e}")
        return {}


class Device:
    def __init__(self, device_name, attributes):
        self.name = device_name
        for key, value in attributes.items():
            setattr(self, key, value["defaultvalue"])

    def random_number(self, datatype, low, high):
        # Generate a random number between low and high
        if datatype == "int":
            # If both bounds are integers, generate an integer
            return random.randint(int(low), int(high))
        else:
            # If any bound is a float, generate a float and round to one decimal place
            return round(random.uniform(low, high), 1)

    def update_parameters(self, attributes):
        # Simulate random changes in parameters
        for key, value in attributes.items():
            if value["IsSimulated"]:
                new_val = self.random_number(value["datatype"], value["minvalue"], value["maxvalue"])
            else:
                print(f"{key}, {value['currentvalue']}")
                new_val = value["currentvalue"]
            setattr(self, key, new_val)


class OPCServer:
    plant_payload = {}
    websocket_url = "ws://localhost:8765"

    def __init__(self):
        OPCServer.plant_payload = read_json_file(data_file)
        logging.info("Initial Plant Payload: %s", OPCServer.plant_payload)
        param_data = OPCServer.plant_payload.get("Plant", {})
        self.device_list = param_data["devices"]
        self.device_params = param_data["device_data"]
        OPCServer.websocket_url = f"ws://localhost:8765/{OPCServer.plant_payload['Plant']['name']}"
        print(OPCServer.websocket_url) 

    async def setup_websocket_client(self):
        async with websockets.connect(self.websocket_url) as websocket:
            while True:
                # Wait for incoming messages from the WebSocket server
                message = await websocket.recv()
                logging.info(f"Received message from WebSocket server: {message}")
                response_data = self.handle_websocket_message(json.loads(message))
                await websocket.send(json.dumps(response_data))
                print("Sent device data.")

    def handle_websocket_message(self, data):
        # Update OPC UA device parameters based on the WebSocket message
        response_data = {}
        command = data.get("command")
        print(data)
        if command == "update_device_parameter":
            ack_data = self.update_device_params(data.get("device_id"), data.get("parameter"), data.get("value"),
                                                 data.get("simulation"))
            response_data = {
                "command": command,
                "data": ack_data
            }
        elif command == "get_device_parameters":
            device_data = self.get_device_parameters()
            response_data = {
                "command": command,
                "data": device_data
            }
        elif command == "update_plant_frequency":
            new_freq = data.get("frequency")
            ack_data = self.update_plant_frequency(new_freq)
            response_data = {
                "command": command,
                "data": ack_data
            }
        elif command == "update_device_parameter_mode":
            ack_data = self.switch_to_simulation(data.get("device_id"), data.get("parameter"),
                                                 data.get("simulation"))
            response_data = {
                "command": command,
                "data": ack_data
            }
        elif command == "get_plant_data":
            print("in get_plant_data")
            plant_data = self.get_plant_details()
            print(plant_data)
            response_data = {
                "command" : command,
                "data" : plant_data
            }
        else:
            print("Not a valid command")

        return response_data
    async def setup_server(self):
        # load the data from file

        # Create a new server instance
        server = Server()
        await server.init()

        # Set endpoint and server name
        server.set_endpoint("opc.tcp://0.0.0.0:4840/freeopcua/server/")
        # await server.start()

        # Create a new namespace
        uri = "Plant Simulation Server"
        idx = await server.register_namespace(uri)

        # Create a new object for bioreactors
        plant_folder = await server.nodes.objects.add_object(idx, "PlantDevices")

        # Create bioreactor instances
        devices = [Device(devicename, OPCServer.plant_payload["Plant"]["device_data"][devicename]) for devicename in self.device_list]
        logging.info("devices created")

        for device in devices:
            device_obj = await plant_folder.add_object(idx, f"{device.name}")
            for key, value in OPCServer.plant_payload["Plant"]["device_data"][device.name].items():
                var = await device_obj.add_variable(idx, key, value["defaultvalue"])
                await var.set_writable()

        async with server:
            logging.info("Starting OPC UA Server...")
            while True:
                for device in devices:
                    device.update_parameters(OPCServer.plant_payload["Plant"]["device_data"][device.name])
                    # Update the variable values
                    device_obj = await plant_folder.get_child(f"{idx}:{device.name}")
                    for key, value in OPCServer.plant_payload["Plant"]["device_data"][device.name].items():
                        var = await device_obj.get_child(f"{idx}:{key}")
                        await var.write_value(device.__getattribute__(key))
                        OPCServer.plant_payload["Plant"]["device_data"][device.name][key]["defaultvalue"] = device.__getattribute__(key)
                        OPCServer.plant_payload["Plant"]["device_data"][device.name][key][
                            "currentvalue"] = device.__getattribute__(key)
                        #print(f"updated values of {device.name} : {key} : {device.__getattribute__(key)}")
                logging.info(f"{time.ctime()} values updated")
                logging.info(OPCServer.plant_payload["Plant"]["frequency"])
                await asyncio.sleep(OPCServer.plant_payload["Plant"]["frequency"])  # Wait for 1 second before the next update


    def update_device_params(self, devicename, paramname, value, simulationmode):
        try:
            if OPCServer.plant_payload["Plant"]["device_data"][devicename][paramname]["datatype"] == "float":
                value = float(value)
            else:
                value = int(value)
            OPCServer.plant_payload["Plant"]["device_data"][devicename][paramname]["IsSimulated"] = simulationmode
            OPCServer.plant_payload["Plant"]["device_data"][devicename][paramname]["currentvalue"] = value
            OPCServer.plant_payload["Plant"]["device_data"][devicename][paramname]["defaultvalue"] = value
            return "success"
        except KeyError:
            return "not found"
        except Exception as e:
            return ""

    def update_plant_frequency(self, frequency):
        logging.info(f"Received frequency update: {frequency}")
        OPCServer.plant_payload["Plant"]["frequency"] = frequency
        return "success"

    def switch_to_simulation(self, devicename, paramname, simulationmode):
        OPCServer.plant_payload["Plant"]["device_data"][devicename][paramname]["IsSimulated"] = simulationmode
        return "success"

    def get_plant_details(self):
        devices = OPCServer.plant_payload["Plant"]["devices"]
        frequency = OPCServer.plant_payload["Plant"]["frequency"]
        return {
            "devices" : devices,
            "frequency" : frequency
        }

    def get_device_parameters(self):
        return OPCServer.plant_payload["Plant"]["device_data"]

async def main():
    opc_obj = OPCServer()
    await asyncio.gather(
        opc_obj.setup_server(),
        opc_obj.setup_websocket_client()
    )

if __name__ == "__main__":
    asyncio.run(main())
