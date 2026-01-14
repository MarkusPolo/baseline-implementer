import time
import serial
import re
import threading
from typing import Optional

class SerialSession:
    def __init__(self, port: str, baud: int = 9600, timeout: float = 0.2):
        self.port = port
        self.baud = baud
        self.timeout = timeout
        self.ser: Optional[serial.Serial] = None
        self.write_delay = 0.02
        self.lock = threading.Lock()

    def connect(self):
        self.ser = serial.Serial(
            self.port,
            baudrate=self.baud,
            timeout=self.timeout,
            rtscts=False,
            dsrdtr=False,
            xonxoff=False,
        )

    def disconnect(self):
        if self.ser and self.ser.is_open:
            self.ser.close()
        self.ser = None

    def read_available(self) -> str:
        if not self.ser:
            raise RuntimeError("Serial port not open")
        with self.lock:
            b = self.ser.read(4096)
        return b.decode(errors="replace") if b else ""

    def read(self, size: int = 1) -> str:
        if not self.ser:
            raise RuntimeError("Serial port not open")
        with self.lock:
            b = self.ser.read(size)
        return b.decode(errors="replace") if b else ""

    def drain(self, seconds: float = 0.8) -> str:
        end = time.monotonic() + seconds
        out = []
        while time.monotonic() < end:
            out.append(self.read_available())
            time.sleep(0.05)
        return "".join(out)

    def send_line(self, line: str):
        if not self.ser:
            raise RuntimeError("Serial port not open")
        self.ser.write((line + "\r\n").encode())
        self.ser.flush()
        time.sleep(self.write_delay)

    def send(self, data: str):
        if not self.ser:
            raise RuntimeError("Serial port not open")
        with self.lock:
            self.ser.write(data.encode())
            self.ser.flush()
        time.sleep(self.write_delay)

    def wait_for(self, pattern: re.Pattern, timeout: float = 10.0) -> str:
        buf = ""
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            buf += self.read_available()
            if pattern.search(buf):
                return buf
            time.sleep(0.05)
        raise TimeoutError(f"Timed out waiting for: {pattern.pattern}\n--- buffer ---\n{buf[-2000:]}")

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
