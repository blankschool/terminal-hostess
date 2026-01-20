"""
Cobalt API Configuration
Manages Cobalt instance selection and configuration
"""
import os
from typing import Dict

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
