from fastapi.middleware.cors import CORSMiddleware
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send
from app.config import settings
import json


# ─── Cache policies per endpoint prefix ───
CACHE_POLICIES = {
    "/api/v1/auth":       "no-store",
    "/api/v1/users":      "private, max-age=30, stale-while-revalidate=10",
    "/api/v1/sessions":   "private, max-age=15, stale-while-revalidate=5",
    "/api/v1/announcements": "private, max-age=60, stale-while-revalidate=15",
    "/api/v1/notifications": "private, max-age=15, stale-while-revalidate=5",
    "/api/v1/dashboard":  "private, max-age=30, stale-while-revalidate=10",
    "/api/v1/profile":    "private, max-age=60, stale-while-revalidate=15",
    "/images":            "public, max-age=86400, immutable",
}


def _get_cache_policy(path: str) -> str:
    for prefix, policy in CACHE_POLICIES.items():
        if path.startswith(prefix):
            return policy
    return "no-store"


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
                headers["X-XSS-Protection"] = "1; mode=block"
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"

                method = scope.get("method", "GET")
                path = scope.get("path", "")
                if method == "GET":
                    headers["Cache-Control"] = _get_cache_policy(path)
                else:
                    headers["Cache-Control"] = "no-store, no-cache, must-revalidate"

            await send(message)

        await self.app(scope, receive, send_with_headers)


def setup_cors(app):
    # Safely parse allowed origins from settings, with fallback
    try:
        origins = list(settings.origins_list)
    except Exception:
        origins = []

    extras = [
        "https://frontend-seven-kappa-41.vercel.app",
        "https://frontend-rj-verdan-tayam.vercel.app",
        "https://here-to-there.vercel.app",
    ]
    for o in extras:
        if o not in origins:
            origins.append(o)

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https://.*\.vercel\.app$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "If-None-Match", "X-Requested-With"],
        expose_headers=["ETag", "Cache-Control"],
    )
