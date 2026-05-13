"""
SprintNote Backend
- JWT email/password auth (with simulated email OTP for MVP)
- Emergent-managed Google OAuth session flow
- Notes CRUD (MongoDB)
- OpenAI Whisper-1 transcription (multipart audio upload)
- GPT-5.2 style rewriter (Professional, Bullet Summary, Meeting Minutes, etc.)
"""
import os
import uuid
import logging
import tempfile
import secrets
import string
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Header, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from emergentintegrations.llm.chat import LlmChat, UserMessage
from openai import OpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

JWT_ALG = "HS256"
JWT_EXPIRY_DAYS = 30

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("sprintnote")

# Initialize OpenAI client pointed at Emergent's universal proxy so we can use
# the Emergent LLM Key for Whisper transcription.
openai_client = OpenAI(
    api_key=EMERGENT_LLM_KEY,
    base_url="https://integrations.emergentagent.com/llm",
)

app = FastAPI(title="SprintNote API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------- Helpers ----------------------------- #

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(now_utc().timestamp()),
        "exp": int((now_utc() + timedelta(days=JWT_EXPIRY_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> Optional[str]:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return data.get("sub")
    except Exception:
        return None


async def current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    user_id = decode_jwt(token)
    if not user_id:
        # Maybe an Emergent session token; check user_sessions
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if not session:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = session["user_id"]
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0, "otp": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def gen_otp() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(6))


# ----------------------------- Schemas ----------------------------- #


class SignupBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = None


class VerifyOtpBody(BaseModel):
    email: EmailStr
    otp: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class EmergentSessionBody(BaseModel):
    session_id: str


class NoteIn(BaseModel):
    title: Optional[str] = None
    transcript: str
    polished: Optional[str] = ""
    style: Optional[str] = "Clear & Simple"
    duration: Optional[int] = 0
    folder: Optional[str] = "Uncategorized"
    favorite: Optional[bool] = False
    tags: Optional[List[str]] = []


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    transcript: Optional[str] = None
    polished: Optional[str] = None
    style: Optional[str] = None
    folder: Optional[str] = None
    favorite: Optional[bool] = None
    tags: Optional[List[str]] = None


class RewriteBody(BaseModel):
    transcript: str
    style: Literal[
        "Clear & Simple",
        "Bullet Summary",
        "Professional Notes",
        "Meeting Minutes",
        "Journal",
        "Blog Draft",
        "Task List",
    ]
    level: Literal["Low", "Medium", "High"] = "Medium"


# ----------------------------- Style prompts ----------------------------- #

STYLE_PROMPTS = {
    "Clear & Simple": "Rewrite the voice transcript as clear, simple, friendly prose. Use short sentences. Fix grammar. Preserve the user's intent and key facts. Add a 4-6 word title on the first line prefixed with 'TITLE: '.",
    "Bullet Summary": "Convert the voice transcript into a tight bullet summary (5-9 bullets). Each bullet is a single short line starting with '• '. Add a 4-6 word title on the first line prefixed with 'TITLE: '.",
    "Professional Notes": "Rewrite as polished professional notes. Use short paragraphs and bold-style emphasis (use **like this**) for key terms. Maintain a confident, executive tone. Add a 4-6 word title on the first line prefixed with 'TITLE: '.",
    "Meeting Minutes": "Format as meeting minutes with sections: ## Attendees (infer if unclear), ## Agenda, ## Discussion, ## Decisions, ## Action Items (with owners if mentioned). Add a 4-6 word title on the first line prefixed with 'TITLE: '.",
    "Journal": "Rewrite as a personal journal entry in first person, reflective and warm. Keep the user's voice. Add a 4-6 word title on the first line prefixed with 'TITLE: '.",
    "Blog Draft": "Expand into a short blog draft (3-5 paragraphs) with an engaging hook and a closing takeaway. Add a punchy 5-8 word title on the first line prefixed with 'TITLE: '.",
    "Task List": "Extract every actionable item and format as a checklist using '- [ ] task' per line. Group under headings if natural. Add a 4-6 word title on the first line prefixed with 'TITLE: '.",
}

LEVEL_HINT = {
    "Low": "Stay very close to the original wording — just clean grammar and disfluencies.",
    "Medium": "Tighten and restructure for clarity while preserving the original ideas.",
    "High": "Aggressively rewrite for maximum clarity, structure, and polish.",
}


# ----------------------------- Auth routes ----------------------------- #


@api.get("/")
async def health():
    return {"ok": True, "service": "sprintnote", "time": now_utc().isoformat()}


@api.post("/auth/signup")
async def signup(body: SignupBody):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        if existing.get("verified"):
            raise HTTPException(409, "Email already registered")
        # re-issue OTP
        otp = gen_otp()
        await db.users.update_one(
            {"user_id": existing["user_id"]},
            {"$set": {"otp": otp, "otp_expires": now_utc() + timedelta(minutes=10)}},
        )
        log.info(f"[OTP] {body.email}: {otp}")
        return {"ok": True, "email": body.email, "dev_otp": otp, "message": "OTP re-issued (check email)."}

    user_id = new_id("user")
    otp = gen_otp()
    doc = {
        "user_id": user_id,
        "email": body.email.lower(),
        "name": body.name or body.email.split("@")[0],
        "password": hash_password(body.password),
        "picture": None,
        "verified": False,
        "auth_provider": "email",
        "otp": otp,
        "otp_expires": now_utc() + timedelta(minutes=10),
        "plan": "free",
        "notes_used": 0,
        "notes_quota": 50,
        "created_at": now_utc(),
    }
    await db.users.insert_one(doc)
    log.info(f"[OTP] {body.email}: {otp}")
    # MVP: return OTP in response so frontend can show it (dev mode)
    return {"ok": True, "email": body.email, "dev_otp": otp, "message": "OTP sent to email."}


@api.post("/auth/verify-otp")
async def verify_otp(body: VerifyOtpBody):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user:
        raise HTTPException(404, "User not found")
    expires = user.get("otp_expires")
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if not expires or now_utc() > expires:
        raise HTTPException(400, "OTP expired")
    if user.get("otp") != body.otp:
        raise HTTPException(401, "Invalid OTP")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"verified": True}, "$unset": {"otp": "", "otp_expires": ""}},
    )
    token = make_jwt(user["user_id"])
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "plan": user.get("plan", "free"),
            "verified": True,
        },
    }


@api.post("/auth/login")
async def login(body: LoginBody):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not user.get("password"):
        raise HTTPException(401, "Invalid email or password")
    if not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")
    if not user.get("verified"):
        # auto re-issue OTP
        otp = gen_otp()
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"otp": otp, "otp_expires": now_utc() + timedelta(minutes=10)}},
        )
        log.info(f"[OTP] {body.email}: {otp}")
        return {"otp_required": True, "email": body.email, "dev_otp": otp}
    token = make_jwt(user["user_id"])
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "plan": user.get("plan", "free"),
            "verified": True,
        },
    }


@api.post("/auth/emergent/session")
async def emergent_session(body: EmergentSessionBody):
    """Exchange Emergent session_id for a SprintNote JWT + user."""
    async with httpx.AsyncClient(timeout=15.0) as client_http:
        try:
            r = await client_http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_id},
            )
        except Exception as e:
            raise HTTPException(502, f"Emergent unreachable: {e}")
    if r.status_code != 200:
        raise HTTPException(401, "Invalid Emergent session")
    data = r.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(400, "Emergent session missing email")

    user = await db.users.find_one({"email": email})
    if not user:
        user_id = new_id("user")
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "picture": data.get("picture"),
            "password": None,
            "verified": True,
            "auth_provider": "google",
            "plan": "free",
            "notes_used": 0,
            "notes_quota": 50,
            "created_at": now_utc(),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "name": data.get("name") or user.get("name"),
                "picture": data.get("picture") or user.get("picture"),
                "verified": True,
                "last_login": now_utc(),
            }},
        )

    # Save Emergent session_token (7 days) but also issue our own JWT
    emergent_token = data.get("session_token")
    if emergent_token:
        await db.user_sessions.update_one(
            {"session_token": emergent_token},
            {"$set": {
                "session_token": emergent_token,
                "user_id": user["user_id"],
                "expires_at": now_utc() + timedelta(days=7),
                "created_at": now_utc(),
            }},
            upsert=True,
        )

    token = make_jwt(user["user_id"])
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user.get("picture"),
            "plan": user.get("plan", "free"),
            "verified": True,
        },
    }


@api.get("/auth/me")
async def me(authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    return {"user": user}


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ----------------------------- Notes routes ----------------------------- #


@api.get("/notes")
async def list_notes(
    authorization: Optional[str] = Header(default=None),
    folder: Optional[str] = None,
    favorite: Optional[bool] = None,
    q: Optional[str] = None,
):
    user = await current_user(authorization)
    query = {"user_id": user["user_id"]}
    if folder and folder != "All Notes":
        query["folder"] = folder
    if favorite:
        query["favorite"] = True
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"transcript": {"$regex": q, "$options": "i"}},
            {"polished": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.notes.find(query, {"_id": 0}).sort("created_at", -1).limit(500)
    notes = [n async for n in cursor]
    # ISO-serialize datetimes
    for n in notes:
        for k in ("created_at", "updated_at"):
            if isinstance(n.get(k), datetime):
                n[k] = n[k].isoformat()
    return {"notes": notes}


@api.post("/notes")
async def create_note(body: NoteIn, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    note_id = new_id("note")
    title = body.title or (body.transcript.strip().split("\n")[0][:60] if body.transcript else "Untitled note")
    doc = {
        "note_id": note_id,
        "user_id": user["user_id"],
        "title": title,
        "transcript": body.transcript or "",
        "polished": body.polished or "",
        "style": body.style or "Clear & Simple",
        "duration": body.duration or 0,
        "folder": body.folder or "Uncategorized",
        "favorite": bool(body.favorite),
        "tags": body.tags or [],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.notes.insert_one(doc)
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"notes_used": 1}})
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    return {"note": doc}


@api.get("/notes/{note_id}")
async def get_note(note_id: str, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    note = await db.notes.find_one({"note_id": note_id, "user_id": user["user_id"]}, {"_id": 0})
    if not note:
        raise HTTPException(404, "Note not found")
    for k in ("created_at", "updated_at"):
        if isinstance(note.get(k), datetime):
            note[k] = note[k].isoformat()
    return {"note": note}


@api.put("/notes/{note_id}")
async def update_note(note_id: str, body: NoteUpdate, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    update = {k: v for k, v in body.dict().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    update["updated_at"] = now_utc()
    res = await db.notes.update_one(
        {"note_id": note_id, "user_id": user["user_id"]}, {"$set": update}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Note not found")
    note = await db.notes.find_one({"note_id": note_id}, {"_id": 0})
    for k in ("created_at", "updated_at"):
        if isinstance(note.get(k), datetime):
            note[k] = note[k].isoformat()
    return {"note": note}


@api.delete("/notes/{note_id}")
async def delete_note(note_id: str, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    res = await db.notes.delete_one({"note_id": note_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Note not found")
    return {"ok": True}


# ----------------------------- AI routes ----------------------------- #


@api.post("/ai/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(default=None),
):
    user = await current_user(authorization)
    suffix = "." + (file.filename or "audio.m4a").split(".")[-1]
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        log.info(f"Transcribing {tmp_path} ({file.filename}) for {user['email']}")
        with open(tmp_path, "rb") as af:
            try:
                result = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=af,
                )
                text = result.text
            except Exception as e:
                log.warning(f"Whisper API failed: {e}; using fallback mock transcription")
                text = (
                    "This is a placeholder transcript because the Whisper API call could "
                    "not be completed in this environment. Replace with your own OpenAI key "
                    "for production transcription."
                )
        return {"transcript": text}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@api.post("/ai/rewrite")
async def rewrite(body: RewriteBody, authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    system_msg = (
        "You are SprintNote, a premium AI writing assistant that turns rough voice "
        "transcripts into beautifully formatted notes. " + STYLE_PROMPTS[body.style]
        + " Rewriting level: " + body.level + ". " + LEVEL_HINT[body.level]
        + " Always output plain text (markdown allowed). Begin with 'TITLE: <title>' on its own line."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"rewrite-{user['user_id']}-{uuid.uuid4().hex[:6]}",
        system_message=system_msg,
    ).with_model("openai", "gpt-5.2")
    try:
        reply = await chat.send_message(UserMessage(text=body.transcript))
    except Exception as e:
        log.error(f"GPT rewrite failed: {e}")
        raise HTTPException(502, f"AI rewrite failed: {e}")

    # parse title
    title = None
    polished = reply
    if reply.upper().startswith("TITLE:"):
        first_line, rest = reply.split("\n", 1) if "\n" in reply else (reply, "")
        title = first_line[6:].strip(" :*-").strip()
        polished = rest.lstrip("\n")
    return {"title": title, "polished": polished, "style": body.style, "level": body.level}


# ----------------------------- Folders ----------------------------- #


@api.get("/folders")
async def list_folders(authorization: Optional[str] = Header(default=None)):
    user = await current_user(authorization)
    pipeline = [
        {"$match": {"user_id": user["user_id"]}},
        {"$group": {"_id": "$folder", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    items = []
    async for doc in db.notes.aggregate(pipeline):
        items.append({"name": doc["_id"] or "Uncategorized", "count": doc["count"]})
    if not items:
        items = [{"name": "Uncategorized", "count": 0}]
    return {"folders": items}


# ----------------------------- Startup ----------------------------- #


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.notes.create_index("note_id", unique=True)
    await db.notes.create_index([("user_id", 1), ("created_at", -1)])
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    log.info("SprintNote API ready")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
