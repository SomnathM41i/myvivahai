"""
main.py — FastAPI application entry point
Old project: Flask factory (app.py)
New project: FastAPI with lifespan context

Dev:  uvicorn app.main:app --reload --port 8000
Prod: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.core.logger import logger
from app.database import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"myvivahai starting [{settings.APP_ENV}]")
    await create_tables()
    yield
    logger.info("myvivahai shutting down")


app = FastAPI(
    title="myvivahai API",
    description="AI-powered matrimonial biodata extraction and matching platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

from app.api.auth_routes import router as auth_router
from app.api.upload_routes import router as upload_router
from app.api.profile_routes import router as profile_router
from app.api.parser_routes import router as parser_router
from app.api.dashboard_routes import router as dashboard_router
from app.api.routes.biodata import router as biodata_router

app.include_router(biodata_router)
app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(profile_router)
app.include_router(parser_router)
app.include_router(dashboard_router)


@app.exception_handler(404)
async def not_found(request, exc):
    return JSONResponse(
        content={"error": "Not found"},
        status_code=404
    )


@app.exception_handler(500)
async def server_error(request, exc):
    return JSONResponse(
        content={"error": "Internal server error"},
        status_code=500
    )


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}
