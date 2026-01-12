from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import os
import serial
from serial_lib.serial_session import SerialSession

router = APIRouter(
    prefix="/console",
    tags=["console"]
)

@router.get("/test")
def test_console():
    return {"status": "console router reachable"}

# In-memory lock for active console sessions in this process
# Note: For multi-process/worker setups, a file-based or Redis-based lock should be used.
active_consoles = set()

@router.websocket("/ws/{port_id}")
async def console_websocket(websocket: WebSocket, port_id: str):
    # Port ID is usually 1-16, mapping to ~/port1 etc.
    port_path = os.path.expanduser(f"~/port{port_id}")
    
    print(f"debug: WebSocket connected for {port_path}, active_consoles={active_consoles}", flush=True)

    if port_path in active_consoles:
        print(f"debug: Port {port_path} is BUSY. Rejecting.", flush=True)
        await websocket.close(code=1008, reason="Port busy (Console active)")
        return

    await websocket.accept()
    active_consoles.add(port_path)
    print(f"debug: Added {port_path} to active_consoles. Current: {active_consoles}", flush=True)
    
    session = None
    try:
        # Check if port exists
        if not os.path.exists(port_path):
            await websocket.send_text(f"\r\n[Error: Port {port_path} does not exist]\r\n")
            await websocket.close()
            return

        session = SerialSession(port_path, baud=9600, timeout=0.1)
        try:
            print(f"debug: Connecting to serial port {port_path}", flush=True)
            session.connect()
        except serial.SerialException as e:
            print(f"debug: Serial connect failed: {e}", flush=True)
            await websocket.send_text(f"\r\n[Error: Could not open port: {str(e)}]\r\n")
            await websocket.close()
            return

        await websocket.send_text(f"\r\n[Connected to {port_path}]\r\n")

        # Bridge tasks
        async def serial_to_ws():
            print("debug: starting serial_to_ws", flush=True)
            try:
                while True:
                    # session.read_available is non-blocking-ish (blocks for timeout)
                    # We use a small timeout in SerialSession to keep this loop responsive
                    data = session.read_available()
                    if data:
                        # print(f"debug: serial -> ws: {repr(data)}", flush=True)
                        await websocket.send_text(data)
                    await asyncio.sleep(0.01)
            except Exception as e:
                print(f"debug: serial_to_ws exception: {e}", flush=True)
                pass
            print("debug: serial_to_ws ended", flush=True)

        async def ws_to_serial():
            print("debug: starting ws_to_serial", flush=True)
            try:
                while True:
                    # Receive raw bytes/text from xterm.js
                    data = await websocket.receive_text()
                    if data:
                        print(f"debug: ws -> serial: {repr(data)}", flush=True)
                        # For now, just pass through everything
                        session.send(data)
            except WebSocketDisconnect:
                print("debug: ws_to_serial disconnect", flush=True)
                raise
            except Exception as e:
                print(f"debug: ws_to_serial exception: {e}", flush=True)
                pass
            print("debug: ws_to_serial ended", flush=True)
        
        # Run both concurrently
        print(f"debug: starting bridge for {port_path}", flush=True)
        await asyncio.gather(serial_to_ws(), ws_to_serial())

    except WebSocketDisconnect:
        print(f"debug: main websocket disconnect", flush=True)
        pass
    except Exception as e:
        print(f"debug: main exception: {e}", flush=True)
        try:
            await websocket.send_text(f"\r\n[Console Error: {str(e)}]\r\n")
        except:
            pass
    finally:
        print(f"debug: cleaning up {port_path}", flush=True)
        if session:
            session.disconnect()
        if port_path in active_consoles:
            active_consoles.remove(port_path)
            print(f"debug: Removed {port_path} from active_consoles. Current: {active_consoles}", flush=True)



