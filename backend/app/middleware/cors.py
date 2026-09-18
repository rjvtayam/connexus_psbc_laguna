from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.config import settings


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


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"

        if request.method == "GET":
            response.headers["Cache-Control"] = _get_cache_policy(request.url.path)
        else:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"

        return response


def setup_cors(app):
    origins = list(settings.origins_list)
    extras = [
        "https://frontend-seven-kappa-41.vercel.app",
        "https://frontend-rj-verdan-tayam.vercel.app",
        "https://here-to-there.vercel.app",
    ]
    for o in extras:
        if o not in origins:
            origins.append(o)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https://.*\.vercel\.app$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "If-None-Match", "X-Requested-With"],
        expose_headers=["ETag", "Cache-Control"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
