"""
SprintNote backend test suite.
Covers: health, auth (signup+OTP+login+me+emergent), notes CRUD, folders, AI rewrite.
"""
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not set"
API = f"{BASE_URL}/api"

# Unique email per test run avoids 409 conflicts on re-runs
RUN_TAG = uuid.uuid4().hex[:8]
NEW_EMAIL = f"test_qa_{RUN_TAG}@sprintnote.com"
NEW_PASSWORD = "qa123456"

VERIFIED_EMAIL = "e2e@sprintnote.com"
VERIFIED_PASSWORD = "e2etest12"

state = {}


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ----------------- Health -----------------
def test_health(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("ok") is True
    assert data.get("service") == "sprintnote"


# ----------------- Auth: signup -> verify-otp -> me -----------------
def test_signup_returns_dev_otp(s):
    r = s.post(f"{API}/auth/signup", json={
        "email": NEW_EMAIL, "password": NEW_PASSWORD, "name": "QA"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("ok") is True
    assert data.get("email") == NEW_EMAIL
    assert "dev_otp" in data and len(data["dev_otp"]) == 6
    state["dev_otp"] = data["dev_otp"]


def test_login_unverified_returns_otp_required(s):
    r = s.post(f"{API}/auth/login", json={
        "email": NEW_EMAIL, "password": NEW_PASSWORD
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("otp_required") is True
    assert "dev_otp" in data
    # Login re-issued OTP; use this one for verify (old one invalidated)
    state["dev_otp"] = data["dev_otp"]


def test_verify_otp_returns_jwt(s):
    otp = state.get("dev_otp")
    assert otp, "OTP missing"
    r = s.post(f"{API}/auth/verify-otp", json={"email": NEW_EMAIL, "otp": otp})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and data["token"]
    assert data["user"]["email"] == NEW_EMAIL
    assert data["user"]["verified"] is True
    state["token"] = data["token"]
    state["user_id"] = data["user"]["user_id"]


def test_login_verified_returns_jwt(s):
    r = s.post(f"{API}/auth/login", json={
        "email": NEW_EMAIL, "password": NEW_PASSWORD
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data
    assert data["user"]["verified"] is True
    state["token"] = data["token"]


def test_auth_me(s):
    token = state["token"]
    r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    user = r.json().get("user")
    assert user["email"] == NEW_EMAIL
    # Ensure sensitive fields not leaked
    assert "password" not in user
    assert "otp" not in user
    assert "_id" not in user


def test_auth_protection_without_token(s):
    r = requests.get(f"{API}/notes")
    assert r.status_code == 401, r.text


def test_emergent_session_invalid(s):
    r = s.post(f"{API}/auth/emergent/session", json={"session_id": "invalid-session-xyz"})
    assert r.status_code == 401, r.text


# ----------------- Notes CRUD -----------------
def _auth():
    return {"Authorization": f"Bearer {state['token']}"}


def test_create_note(s):
    r = s.post(f"{API}/notes", json={
        "title": "TEST_note_one",
        "transcript": "This is a quick voice memo about shipping the v1 release on Friday.",
        "polished": "",
        "style": "Clear & Simple",
        "duration": 12,
        "folder": "Work",
        "favorite": False,
        "tags": ["test", "qa"],
    }, headers=_auth())
    assert r.status_code == 200, r.text
    note = r.json()["note"]
    assert note["title"] == "TEST_note_one"
    assert note["folder"] == "Work"
    assert "note_id" in note
    assert "_id" not in note
    state["note_id"] = note["note_id"]


def test_list_notes(s):
    r = s.get(f"{API}/notes", headers=_auth())
    assert r.status_code == 200, r.text
    notes = r.json()["notes"]
    assert isinstance(notes, list)
    assert any(n["note_id"] == state["note_id"] for n in notes)
    for n in notes:
        assert "_id" not in n


def test_get_note(s):
    r = s.get(f"{API}/notes/{state['note_id']}", headers=_auth())
    assert r.status_code == 200, r.text
    note = r.json()["note"]
    assert note["note_id"] == state["note_id"]
    assert "_id" not in note


def test_update_note(s):
    r = s.put(f"{API}/notes/{state['note_id']}", json={
        "title": "TEST_note_one_updated",
        "favorite": True,
        "polished": "Polished content here.",
    }, headers=_auth())
    assert r.status_code == 200, r.text
    note = r.json()["note"]
    assert note["title"] == "TEST_note_one_updated"
    assert note["favorite"] is True
    assert note["polished"] == "Polished content here."

    # Verify persistence via GET
    g = s.get(f"{API}/notes/{state['note_id']}", headers=_auth())
    assert g.json()["note"]["favorite"] is True


def test_folders_counts(s):
    r = s.get(f"{API}/folders", headers=_auth())
    assert r.status_code == 200, r.text
    folders = r.json()["folders"]
    assert isinstance(folders, list) and len(folders) >= 1
    # We created a note in folder "Work"
    names = [f["name"] for f in folders]
    assert "Work" in names
    work = next(f for f in folders if f["name"] == "Work")
    assert work["count"] >= 1


# ----------------- AI Rewrite (GPT-5.2) -----------------
def test_ai_rewrite_meeting_minutes(s):
    transcript = (
        "Quick standup. Alice will update the auth API. Bob will fix the recording UI by Thursday. "
        "We decided to delay the analytics dashboard to next sprint. Open question: pricing tiers."
    )
    r = s.post(f"{API}/ai/rewrite", json={
        "transcript": transcript,
        "style": "Meeting Minutes",
        "level": "Medium",
    }, headers=_auth(), timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("style") == "Meeting Minutes"
    assert data.get("level") == "Medium"
    polished = data.get("polished") or ""
    assert len(polished) > 30, f"polished too short: {polished!r}"
    # Title parsed out of TITLE: prefix
    assert data.get("title"), "title should be parsed"
    # Meeting minutes should contain at least one expected section header
    lower = polished.lower()
    assert any(s in lower for s in ["agenda", "discussion", "decision", "action item", "attendee"])


def test_ai_rewrite_bullet_summary_high(s):
    transcript = (
        "Today I want to focus on three things. First, finalize the onboarding email copy. "
        "Second, ship the new pricing page. Third, set up the new monitoring alerts for production."
    )
    r = s.post(f"{API}/ai/rewrite", json={
        "transcript": transcript,
        "style": "Bullet Summary",
        "level": "High",
    }, headers=_auth(), timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    polished = data.get("polished") or ""
    assert "•" in polished, f"expected bullet markers, got: {polished!r}"
    assert data.get("title")


# ----------------- Delete & cleanup -----------------
def test_delete_note(s):
    r = s.delete(f"{API}/notes/{state['note_id']}", headers=_auth())
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True
    # Verify gone
    g = s.get(f"{API}/notes/{state['note_id']}", headers=_auth())
    assert g.status_code == 404
