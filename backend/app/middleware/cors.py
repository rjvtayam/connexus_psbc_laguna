from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.config import settings


# ─── Cache policies per endpoint prefix ───
# GET responses get these Cache-Control headers
# POST/PUT/DELETE always get no-cache (handled by cache invalidation)
CACHE_POLICIES = {
    # Auth — never cache
    "/api/v1/auth":       "no-store",
    # Users — short cache (30s)
    "/api/v1/users":      "private, max-age=30, stale-while-revalidate=10",
    # Sessions — very short (15s)
    "/api/v1/sessions":   "private, max-age=15, stale-while-revalidate=5",
    # Announcements / Bulletins — medium cache (60s)
    "/api/v1/announcements": "private, max-age=60, stale-while-revalidate=15",
    # Notifications — short cache (15s)
    "/api/v1/notifications": "private, max-age=15, stale-while-revalidate=5",
    # Dashboard — medium cache (30s)
    "/api/v1/dashboard":  "private, max-age=30, stale-while-revalidate=10",
    # Profile — longer cache (60s)
    "/api/v1/profile":    "private, max-age=60, stale-while-revalidate=15",
    # Static images — long cache (1 day)
    "/images":            "public, max-age=86400, immutable",
}


def _get_cache_policy(path: str) -> str:
    """Find the best matching cache policy for a path."""
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
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Smart cache headers: GET gets policy, mutations get no-cache
        if request.method == "GET":
            response.headers["Cache-Control"] = _get_cache_policy(request.url.path)
        else:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        # ETag support for GET responses with body
        if request.method == "GET" and response.status_code == 200:
            body = b""
            async for chunk in response.body_iterator:
                body += chunk if isinstance(chunk, bytes) else chunk.encode()
            # Always re-create response since body_iterator is consumed
            from starlette.responses import Response as StarletteResponse
            headers = dict(response.headers)
            if body:
                import hashlib
                etag = hashlib.md5(body).hexdigest()[:16]
                headers["ETag"] = f'"{etag}"'
                # Check If-None-Match for 304 responses
                if_none_match = request.headers.get("if-none-match")
                if if_none_match and if_none_match.strip('"') == etag:
                    return StarletteResponse(status_code=304, headers={
                        "ETag": f'"{etag}"',
                        "Cache-Control": headers.get("Cache-Control", "no-store"),
                    })
            return StarletteResponse(
                content=body,
                status_code=response.status_code,
                headers=headers,
                media_type=response.media_type,
            )

        return response


def setup_cors(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "If-None-Match"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
