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

@router.get("/ports")
def list_ports():
    ports = []
    # Check ports 1-16
    for i in range(1, 17):
        port_path = os.path.expanduser(f"~/port{i}")
        exists = os.path.exists(port_path)
        is_busy = port_path in active_consoles
        
        ports.append({
            "id": i,
            "path": port_path,
            "connected": exists, # "connected" means the device/symlink exists
            "busy": is_busy
        })
    return ports

# In-memory lock for active console sessions in this process
# Note: For multi-process/worker setups, a file-based or Redis-based lock should be used.
active_consoles = set()

@router.websocket("/ws/{port_id}")
async def console_websocket(websocket: WebSocket, port_id: str):
    import json
    port_path = os.path.expanduser(f"~/port{port_id}")
    print(f"debug: WebSocket connected for {port_path}", flush=True)

    if port_path in active_consoles:
        await asyncio.sleep(0.5)
        if port_path in active_consoles:
            await websocket.close(code=1008, reason="Port busy (Console active)")
            return

    await websocket.accept()
    active_consoles.add(port_path)
    
    session = None
    try:
        if not os.path.exists(port_path):
            await websocket.send_text(f"\r\n[Error: Port {port_path} does not exist]\r\n")
            await websocket.close()
            return

        session = SerialSession(port_path, baud=9600, timeout=0.1)
        try:
            await asyncio.to_thread(session.connect)
        except serial.SerialException as e:
            await websocket.send_text(f"\r\n[Error: Could not open port: {str(e)}]\r\n")
            await websocket.close()
            return

        await websocket.send_text(f"\r\n[Connected to {port_path}]\r\n")

        # Shared state for this session
        state = {
            "is_capturing": False,
            "backspace_sequence": "\x7f" # Default
        }

        async def serial_to_ws():
            try:
                while True:
                    data = await asyncio.to_thread(session.read_available)
                    if data:
                        await websocket.send_text(data)
                    await asyncio.sleep(0.01)
            except Exception:
                pass

        async def run_capture(command: str):
            state["is_capturing"] = True
            try:
                from serial_lib.command_runner import CommandRunner
                runner = CommandRunner(session)
                
                # We need to send the command and wait for prompt while handling pagination
                # CommandRunner.run_show already does exactly this!
                output = await asyncio.to_thread(runner.run_show, command)
                
                # Send result back via control message
                await websocket.send_text(json.dumps({
                    "type": "capture_result",
                    "command": command,
                    "output": output
                }))
            except Exception as e:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": f"Capture failed: {str(e)}"
                }))
            finally:
                state["is_capturing"] = False

        async def ws_to_serial():
            try:
                while True:
                    msg = await websocket.receive_text()
                    if not msg:
                        continue
                    
                    # Check if it's a control message (JSON)
                    if msg.startswith("{") and msg.endswith("}"):
                        try:
                            data = json.loads(msg)
                            msg_type = data.get("type")
                            
                            if msg_type == "capture":
                                cmd = data.get("command")
                                if cmd:
                                    asyncio.create_task(run_capture(cmd))
                            elif msg_type == "set_backspace":
                                state["backspace_sequence"] = data.get("sequence", "\x7f")
                            continue
                        except json.JSONDecodeError:
                            pass # Not JSON, treat as raw data
                    
                    # Raw data (from xterm.js)
                    # Handle Backspace Translation
                    if msg == "\x7f": # xterm.js usually sends 127 for backspace
                         msg = state["backspace_sequence"]
                    
                    if not state["is_capturing"]:
                         await asyncio.to_thread(session.send, msg)
            except WebSocketDisconnect:
                raise
            except Exception:
                pass
        
        await asyncio.gather(serial_to_ws(), ws_to_serial())

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(f"\r\n[Console Error: {str(e)}]\r\n")
        except:
            pass
    finally:
        if session:
            await asyncio.to_thread(session.disconnect)
        if port_path in active_consoles:
            active_consoles.remove(port_path)



