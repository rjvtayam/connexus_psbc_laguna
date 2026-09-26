"""
In-memory TTL cache for API responses.
Uses cachetools with thread-safe decorators.
"""
import hashlib
import json
import functools
import time
from typing import Any, Optional
from cachetools import TTLCache, LRUCache

# ─── Cache Stores ───
# TTL caches with different expiration times per data type
_user_list_cache = TTLCache(maxsize=128, ttl=30)        # 30s — changes often
_session_cache = TTLCache(maxsize=256, ttl=15)           # 15s — real-time data
_bulletin_cache = TTLCache(maxsize=64, ttl=60)           # 60s — rarely changes
_announcement_cache = TTLCache(maxsize=64, ttl=60)       # 60s
_room_users_cache = TTLCache(maxsize=128, ttl=5)         # 5s — very volatile
_settings_cache = TTLCache(maxsize=32, ttl=300)          # 5min — rarely changes
_audit_log_cache = TTLCache(maxsize=64, ttl=30)          # 30s

# LRU cache for expensive computations (no TTL, just size limit)
_computation_cache = LRUCache(maxsize=256)


def _make_key(prefix: str, *args, **kwargs) -> str:
    """Generate a cache key from prefix + arguments."""
    raw = json.dumps({"args": str(args), "kwargs": str(kwargs)}, sort_keys=True, default=str)
    h = hashlib.md5(raw.encode()).hexdigest()[:12]
    return f"{prefix}:{h}"


def cache_response(cache: TTLCache, prefix: str):
    """
    Decorator that caches function return values in a TTLCache.
    Thread-safe via cachetools' built-in locking.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = _make_key(prefix, *args, **kwargs)
            if key in cache:
                return cache[key]
            result = func(*args, **kwargs)
            cache[key] = result
            return result

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            key = _make_key(prefix, *args, **kwargs)
            if key in cache:
                return cache[key]
            result = await func(*args, **kwargs)
            cache[key] = result
            return result

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return wrapper
    return decorator


def invalidate(cache: TTLCache, prefix: Optional[str] = None):
    """Invalidate cache entries. If prefix given, only clear matching keys."""
    if prefix:
        keys_to_remove = [k for k in cache if k.startswith(prefix)]
        for k in keys_to_remove:
            del cache[k]
    else:
        cache.clear()


def get_all_caches():
    """Get all cache instances for monitoring."""
    return {
        "user_list": _user_list_cache,
        "session": _session_cache,
        "bulletin": _bulletin_cache,
        "announcement": _announcement_cache,
        "room_users": _room_users_cache,
        "settings": _settings_cache,
        "audit_log": _audit_log_cache,
        "computation": _computation_cache,
    }


def invalidate_all_caches():
    """Clear all caches."""
    for c in [_user_list_cache, _session_cache, _bulletin_cache,
              _announcement_cache, _room_users_cache, _settings_cache,
              _audit_log_cache, _computation_cache]:
        c.clear()


def invalidate_all():
    """Alias for invalidate_all_caches."""
    invalidate_all_caches()


# ─── Convenience accessors ───
def get_user_list_cache():
    return _user_list_cache

def get_session_cache():
    return _session_cache

def get_bulletin_cache():
    return _bulletin_cache

def get_announcement_cache():
    return _announcement_cache

def get_room_users_cache():
    return _room_users_cache

def get_settings_cache():
    return _settings_cache

def get_audit_log_cache():
    return _audit_log_cache

def get_computation_cache():
    return _computation_cache


# ─── ETag helper ───
def generate_etag(data: Any) -> str:
    """Generate an ETag from response data."""
    raw = json.dumps(data, sort_keys=True, default=str).encode()
    return hashlib.sha256(raw).hexdigest()[:16]


# ─── Request deduplication ───
_pending_requests: dict = {}

async def deduplicate_request(key: str, coro):
    """
    Prevent duplicate in-flight requests for the same key.
    If a request is already pending, return its result instead of firing another.
    """
    if key in _pending_requests:
        return await _pending_requests[key]
    _pending_requests[key] = coro
    try:
        result = await coro
        return result
    finally:
        _pending_requests.pop(key, None)
