from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import socketio as socketio_lib
from app.config import settings
from app.api.v1.router import api_router
from app.middleware.cors import setup_cors
from app.middleware.rate_limit import limiter
from app.signaling.events import sio
from app.database import engine, warmup_db


def _add_cors_headers(request: Request, response: JSONResponse) -> JSONResponse:
    """Add CORS headers to error responses."""
    origin = request.headers.get("origin")
    if origin and any(origin.startswith(o.rstrip("*")) for o in settings.origins_list):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, If-None-Match, X-Requested-With"
        response.headers["Vary"] = "Origin"
    return response


def create_app() -> FastAPI:
    app = FastAPI(
        title="Here to There API",
        description="Live Video Portal for Intercampus Communication",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    app.state.limiter = limiter

    def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        response = _rate_limit_exceeded_handler(request, exc)
        return _add_cors_headers(request, response)

    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

    setup_cors(app)
    app.include_router(api_router, prefix="/api/v1")

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Please try again later."},
        )
        return _add_cors_headers(request, response)

    @app.get("/health")
    @limiter.exempt
    def health_check():
        try:
            with engine.connect() as conn:
                conn.execute(__import__("sqlalchemy").text("SELECT 1"))
            db_status = "connected"
        except Exception:
            db_status = "disconnected"
        return {"status": "healthy" if db_status == "connected" else "degraded", "database": db_status, "service": "here-to-there"}

    @app.on_event("startup")
    def startup():
        warmup_db()

    @app.on_event("shutdown")
    def shutdown():
        engine.dispose()

    return app


fastapi_app = create_app()
app = socketio_lib.ASGIApp(sio, other_asgi_app=fastapi_app)
