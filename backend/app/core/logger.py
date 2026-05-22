import sys
from pathlib import Path
from loguru import logger

LOG_DIR = Path("storage/logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)

logger.remove()
logger.add(sys.stdout, colorize=True, level="DEBUG",
    format="<green>{time:HH:mm:ss}</green> | <level>{level:<8}</level> | "
           "<cyan>{name}</cyan>:<cyan>{line}</cyan> — <level>{message}</level>")
logger.add(LOG_DIR / "app.log", rotation="10 MB", retention="30 days",
    compression="zip", level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level:<8} | {name}:{line} — {message}")
logger.add(LOG_DIR / "error.log", rotation="10 MB", retention="60 days",
    compression="zip", level="ERROR")

__all__ = ["logger"]
