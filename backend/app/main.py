from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .db import Base, SessionLocal, engine
from .services.policy_engine import seed_demo_policies
from .routers import actions, approvals, contract, evaluations, monitoring, openai_agent, policies, scanning


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_policies(db)
    yield


app = FastAPI(
    title="Agent Hijack Shield API",
    description="Local-only simulated agent action protection API.",
    version="1.0.0",
    lifespan=lifespan,
)
origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.include_router(contract.router)
app.include_router(openai_agent.router)
app.include_router(scanning.router)
app.include_router(policies.router)
app.include_router(approvals.router)
app.include_router(actions.router)
app.include_router(evaluations.router)
app.include_router(monitoring.router)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "local-demo"}
