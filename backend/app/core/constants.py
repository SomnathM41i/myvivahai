from enum import Enum


class UploadStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class FileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    DOC = "doc"
    IMAGE = "image"
    TXT = "txt"


IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp"}
MAX_CHARS_PER_LLM_CALL = 8000
