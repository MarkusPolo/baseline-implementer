import asyncio
import websockets
import sys

async def test_connection():
    uri = "ws://127.0.0.1:8000/console/ws/8"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected successfully!")
            await websocket.send("Hello")
            response = await websocket.recv()
            print(f"Received: {response}")
    except Exception as e:
        print(f"Connection failed: {e}")
        # Print headers if available in exception
        if hasattr(e, 'response'):
             print(f"Response Status: {e.response.status_code}")
             print(f"Response Headers: {e.response.headers}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_connection())
