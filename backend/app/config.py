from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/here_to_there"
    JWT_SECRET_KEY: str = "change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOWED_ORIGINS: str = '["http://localhost:5173","https://here-to-there.vercel.app","https://frontend-seven-kappa-41.vercel.app","https://frontend-rj-verdan-tayam.vercel.app"]'
    STUN_SERVER: str = "stun:stun.l.google.com:19302"
    TURN_SERVER: str = ""
    TURN_USERNAME: str = ""
    TURN_CREDENTIAL: str = ""
    UPLOAD_DIR: str = "uploads/recordings"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024
    MAX_CHAT_MESSAGE_LENGTH: int = 500
    RATE_LIMIT_AUTH: str = "10/minute"
    RATE_LIMIT_API: str = "60/minute"

    class Config:
        env_file = ".env"

    @property
    def origins_list(self) -> List[str]:
        return json.loads(self.ALLOWED_ORIGINS)


settings = Settings()
