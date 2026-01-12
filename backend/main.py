import os
import sys
# Ensure project root is in path for serial_lib imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import templates, jobs, profiles, console, macros

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.on_event("startup")
async def startup_check():
    try:
        import websockets
        print("DEBUG: websockets library is available.")
    except ImportError:
        print("DEBUG: websockets library is NOT available.")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"DEBUG MIDDLEWARE: path={request.url.path} type=http headers={request.headers}")
    response = await call_next(request)
    return response

# Note: @app.middleware("http") only catches http. We need pure ASGI for websocket logging?
# FastAPI middleware usage usually wraps everything.
# But "http" middleware won't run for websockets.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for MVP dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(templates.router)
app.include_router(jobs.router)
app.include_router(profiles.router)
app.include_router(console.router)
app.include_router(macros.router)

@app.get("/")
def read_root():
    return {"message": "Serial Switch Configurator API"}

@app.on_event("startup")
async def startup_event():
    print("ALL REGISTERED ROUTES:")
    for route in app.routes:
        print(f"Path: {route.path} | Name: {route.name} | Methods: {getattr(route, 'methods', None)}")

