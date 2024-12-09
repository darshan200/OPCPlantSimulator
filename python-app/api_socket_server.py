import asyncio
import json
from quart import Quart, jsonify, abort, request
from quart_cors import cors
import websockets
import docker
import os


class PlantAPI:

    def __init__(self):
        self.app = Quart(__name__)
        cors(self.app, allow_origin="*")

        # Define routes
        self.app.add_url_rule('/container-status', 'get_container_status', self.get_container_status, methods=['GET'])
        self.app.add_url_rule('/plants', 'get_plants', self.get_plants, methods=['GET'])
        self.app.add_url_rule('/<plant_id>/devices', 'get_device_data', self.get_device_data, methods=['GET'])
        self.app.add_url_rule('/<plant_id>/updateFreq', 'update_frequency', self.update_frequency, methods=['POST'])
        self.app.add_url_rule('/<plant_id>/<device_id>/<parameter>', 'update_device_value', self.update_device_value,
                              methods=['POST'])
        self.app.add_url_rule('/<plant_id>/<device_id>', 'get_device_info', self.get_device_info, methods=['GET'])
        self.app.add_url_rule('/<plant_id>/<device_id>/values', 'get_device_values', self.get_device_values,
                              methods=['GET'])

        self.connected_clients = {}
        self.plants = []
        self.lock = asyncio.Lock()
        self.message_queue = asyncio.Queue()
        self.websocket_server = websockets.serve(self.handle_websocket, "localhost", 8765)

    async def get_container_status(self):
        """Fetch the health status of Docker containers."""
        try:
            client = docker.from_env()  # Initialize Docker client
            containers = client.containers.list(all=True)  # List all containers
             # Dynamically determine the relevant project prefix

            project_name = os.getenv('PROJECT_NAME', '').lower() # Convert to lowercase for matching # Default to an empty string if not set
            print("Dynamically Determined Project Name:", project_name)  # Debug log

            # Filter containers relevant to this project
            relevant_containers = [
                container for container in containers if container.name.startswith(project_name)
            ]
            print("Relevant Containers:", [container.name for container in relevant_containers])  # Debug log

            # Simplify the status to "Running" or "Not Running"
            statuses = {
                container.name: "Running" if container.status == "running" else "Not Running"
                for container in relevant_containers
            }

            return jsonify(statuses), 200

        
            return jsonify(statuses), 200
        except Exception as e:
            print(f"Error fetching container statuses: {e}")
            return jsonify({"error": "Unable to fetch container statuses"}), 500
        
    async def handle_websocket(self, websocket, path):
        client_id = path.strip("/")
        print(f"Client connected: {client_id}")

        self.plants.append(client_id)
        self.connected_clients[client_id] = websocket

        try:
            await self.listen_for_messages(websocket, client_id)
        finally:
            del self.connected_clients[client_id]
            self.plants.remove(client_id)
            print(f"Client disconnected: {client_id}")

    async def listen_for_messages(self, websocket, client_id):
        try:
            async for message in websocket:
                response_data = json.loads(message)
                await self.message_queue.put(response_data)
                print(f"Response from {client_id}: {response_data}")
        except websockets.exceptions.ConnectionClosed:
            print(f"Connection closed for client {client_id}")
        except Exception as e:
            print(f"Error with client {client_id}: {e}")

    async def send_to_plant(self, plant_id, data):
        if plant_id in self.connected_clients:
            message = json.dumps(data)
            websock = self.connected_clients[plant_id]

            # Ensure only one send/recv operation at a time
            await websock.send(message)
            return await self.message_queue.get()

    async def broadcast_all(self, data):
        if self.connected_clients:
            message = json.dumps(data)
            await asyncio.wait([client.send(message) for client in self.connected_clients.values()])

    def get_plants(self):
        return jsonify(self.plants), 200

    async def get_device_data(self, plant_id):
        if plant_id in self.connected_clients:
            data = {"command": "get_plant_data"}
            status = await self.send_to_plant(plant_id, data)
            print(status)
            if status:
                print(f"send successful , {status}")
                if status["command"] == "get_plant_data":
                    return jsonify(status["data"]), 200
        else:
            return abort(404, description="Plant not found")

    async def update_frequency(self, plant_id):
        if plant_id in self.connected_clients:
            data = await request.get_json()
            new_frequency = data.get("value")

            if isinstance(new_frequency, int) and new_frequency > 0:
                command_data = {"command": "update_plant_frequency", "frequency": new_frequency}
                status = await self.send_to_plant(plant_id, command_data)
                if status:
                    print(f"send successful , {status}")
                    if status["command"] == "update_plant_frequency":
                        return jsonify(status["data"]), 200
                    else:
                        return abort(400, description="Response not received")
                else:
                    return abort(400, description="command send failed")

            else:
                return abort(400, description="Invalid frequency value")
        else:
            return abort(404, description="Plant not found")

    async def update_device_value(self, plant_id, device_id, parameter):
        if plant_id in self.connected_clients:
            data = await request.get_json()
            new_value = data.get("value")
            simulation = data.get("simulation")
            data = {
                "command" : "update_device_parameter",
                "device_id" : device_id,
                "parameter" : parameter,
                "value" : new_value,
                "simulation" : simulation
            }

            if simulation is False:
                status = await self.send_to_plant(plant_id,data)

                if status:
                    print(f"send successful , {status}")
                    if status["command"] == "update_device_parameter" and status["data"] == "success":
                        return jsonify({"status": "success"}), 200

                    elif status["command"] == "update_device_parameter" and status["data"] == "not found":
                        return abort(404, description="Device or parameter not found")

                    else:
                        return abort(400, description="Update parameter failed")
            else:
                data = {
                    "command": "update_device_parameter_mode",
                    "device_id": device_id,
                    "parameter": parameter,
                    "simulation": simulation
                }
                status = await self.send_to_plant(plant_id, data)
                if status:
                    print(f"send successful , {status}")
                    if status["command"] == "update_device_parameter_mode" and status["data"] == "success":
                        return jsonify({"status": "success"}), 200
                    else:
                        return abort(400, description="Update simulation mode failed")
        else:
            return abort(404, description="Plant not found")

    async def get_device_info(self, plant_id, device_id):
        if plant_id in self.connected_clients:
            data = {
                "command": "get_device_parameters"
            }
            status = await self.send_to_plant(plant_id, data)
            if status:
                print(f"send successful , {status}")
                if status["command"] == "get_device_parameters":
                    try:
                        device_data = status["data"].get(device_id)
                        formatted_device_data = {
                            key: {
                                "value": value["currentvalue"] if not value["IsSimulated"] else value["defaultvalue"],
                                "IsSimulated": value["IsSimulated"],
                                "IsEditable": value["IsEditable"]
                            } for key, value in device_data.items()
                        }
                        return jsonify(formatted_device_data), 200
                    except:
                        return abort(404, description="Device not found")
            else:
                return abort(400, description="Response not received")
        else:
            return abort(404, description="Plant not found")

    async def get_device_values(self, plant_id, device_id):
        if plant_id in self.connected_clients:
            data = {
                "command": "get_device_parameters"
            }
            status = await self.send_to_plant(plant_id, data)
            if status:
                print(f"send successful , {status}")
                if status["command"] == "get_device_parameters":
                    try:
                        values = {}
                        device_data = status["data"].get(device_id)
                        for key, value in device_data.items():
                            values[key] = value["currentvalue"] if not value["IsSimulated"] else value["defaultvalue"]
                        return jsonify(values), 200
                    except:
                        return abort(404, description="Device not found")
            else:
                return abort(400, description="Response not received")
        else:
            return abort(404, description="Plant not found")


    async def run_websocket(self):
        async with self.websocket_server:
            await asyncio.Future()  # Run forever

    async def run_quart(self, host='0.0.0.0', port=8000):
        print(f"Starting API server on {host}:{port}")
        await self.app.run_task(host=host, port=port)


async def main():
    api_obj = PlantAPI()
    await asyncio.gather(
        api_obj.run_quart(),
        api_obj.run_websocket()
    )


if __name__ == "__main__":
    asyncio.run(main())
