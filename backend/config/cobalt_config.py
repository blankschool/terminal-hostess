"""
Cobalt API Configuration
Manages Cobalt instance selection and configuration
"""
import os
from typing import Dict, List

# Available Cobalt instances
COBALT_INSTANCES: Dict[str, str] = {
    "public": "https://api.cobalt.tools",
    "self_hosted": os.getenv("COBALT_SELF_HOSTED_URL", "http://localhost:9000")
}

# Current instance selection (can be changed via environment variable)
COBALT_CURRENT = os.getenv("COBALT_INSTANCE", "public")
COBALT_API_URL = COBALT_INSTANCES.get(COBALT_CURRENT, COBALT_INSTANCES["public"])

# Optional API key for self-hosted instances
COBALT_API_KEY = os.getenv("COBALT_API_KEY", "")

# Quality settings
COBALT_DEFAULT_QUALITY = os.getenv("COBALT_DEFAULT_QUALITY", "max")

# Timeout settings (in seconds)
COBALT_TIMEOUT = int(os.getenv("COBALT_TIMEOUT", "60"))

# Enable/disable fallback to yt-dlp on Cobalt failure
# Default to TRUE because public Cobalt API is often blocked by YouTube
ENABLE_YTDLP_FALLBACK = os.getenv("ENABLE_YTDLP_FALLBACK", "true").lower() == "true"

# Use Cobalt as primary download method (instead of yt-dlp/gallery-dl)
# Default to FALSE because public Cobalt API now requires JWT authentication
# Set to TRUE only if you have a self-hosted Cobalt instance configured
COBALT_PRIMARY = os.getenv("COBALT_PRIMARY", "false").lower() == "true"

# Platforms supported by Cobalt API
# Reference: https://github.com/imputnet/cobalt
COBALT_SUPPORTED_PLATFORMS: List[str] = [
    "youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "music.youtube.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "tiktok.com",
    "reddit.com",
    "pinterest.com",
    "pin.it",
    "twitch.tv",
    "vimeo.com",
    "soundcloud.com",
    "bilibili.com",
    "bilibili.tv",
    "tumblr.com",
    "vine.co",
    "vk.com",
    "ok.ru",
    "dailymotion.com",
    "loom.com",
    "streamable.com",
    "rutube.ru",
    "snapchat.com",
    "facebook.com",
    "fb.watch",
]


def get_cobalt_url() -> str:
    """Returns the current Cobalt API URL"""
    return COBALT_API_URL


def get_cobalt_headers() -> Dict[str, str]:
    """Returns headers for Cobalt API requests"""
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    
    if COBALT_API_KEY:
        headers["Authorization"] = f"Api-Key {COBALT_API_KEY}"
    
    return headers


def is_cobalt_supported(url: str) -> bool:
    """Check if URL is supported by Cobalt API"""
    url_lower = url.lower()
    return any(platform in url_lower for platform in COBALT_SUPPORTED_PLATFORMS)


def should_use_cobalt(url: str) -> bool:
    """Determine if Cobalt should be used for this URL"""
    if not COBALT_PRIMARY:
        return False
    return is_cobalt_supported(url)
