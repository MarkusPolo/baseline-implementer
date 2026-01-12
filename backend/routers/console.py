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
    print(f"debug: WebSocket connected for {port_path}", flush=True)

    if port_path in active_consoles:
        # Simple retry logic to handle race conditions during rapid reconnects
        await asyncio.sleep(0.5)
        if port_path in active_consoles:
            await websocket.close(code=1008, reason="Port busy (Console active)")
            return

    await websocket.accept()
    active_consoles.add(port_path)
    
    session = None
    try:
        # Check if port exists
        if not os.path.exists(port_path):
            await websocket.send_text(f"\r\n[Error: Port {port_path} does not exist]\r\n")
            await websocket.close()
            return

        session = SerialSession(port_path, baud=9600, timeout=0.1)
        try:
            # Run connect in thread to avoid blocking if it takes time
            await asyncio.to_thread(session.connect)
        except serial.SerialException as e:
            await websocket.send_text(f"\r\n[Error: Could not open port: {str(e)}]\r\n")
            await websocket.close()
            return

        await websocket.send_text(f"\r\n[Connected to {port_path}]\r\n")

        # Bridge tasks
        async def serial_to_ws():
            try:
                while True:
                    # Run read in thread to avoid blocking (read_available reads 4096 bytes)
                    # session.read_available is fast but could block slightly on I/O
                    data = await asyncio.to_thread(session.read_available)
                    if data:
                        await websocket.send_text(data)
                    await asyncio.sleep(0.01)
            except Exception:
                pass

        async def ws_to_serial():
            try:
                while True:
                    # Receive raw bytes/text from xterm.js
                    data = await websocket.receive_text()
                    if data:
                        # sending can block for 0.12s due to SerialSession.send sleep
                        await asyncio.to_thread(session.send, data)
            except WebSocketDisconnect:
                raise
            except Exception:
                pass
        
        # Run both concurrently
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



