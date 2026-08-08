"""
Roials Mission Control — Sync Service (FastAPI)
Speglar Kanban-state till ClickUp och Zoho CRM.
Auto-detekterar credentials i .env — zero-config activation.
Inkluderar /chat-proxy som streamar opencode-zen (Big Pickle/Deepseek) till brädan.
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import StreamingResponse
    import uvicorn
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

import urllib.error
import urllib.parse
import urllib.request

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("roials-sync")

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
KANBAN_TASKS_FILE = PROJECT_ROOT / "roials-agent-kanban" / "src" / "data" / "tasks.json"
KANBAN_AGENTS_FILE = PROJECT_ROOT / "roials-agent-kanban" / "src" / "data" / "agents.json"
ENV_FILE = PROJECT_ROOT / "Roials-Alpha-GTM" / "config" / ".env"
CLICKUP_ENV_FILE = PROJECT_ROOT / ".env"


def _load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


# ─── OpenCode-Zen chat-proxy ──────────────────────────────────────────────────

HERMES_ENV = Path(os.path.expanduser("~/.hermes/.env"))
ZEN_API_URL = "https://opencode.ai/zen/v1/chat/completions"
BROWSER_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
              "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

ZEN_MODELS = {
    "big-pickle": "Big Pickle (kvalitet, gratis)",
    "deepseek-v4-flash-free": "DeepSeek V4 Flash (snabb, gratis)",
    "mimo-v2.5-free": "Mimo 2.5 (gratis)",
    "ling-3.0-flash-free": "Ling 3.0 Flash (gratis)",
    "ling-3.0-tiny-free": "Ling 3.0 Tiny (gratis)",
    "north-mini-code-free": "North Mini Code (gratis)",
    "laguna-s-2.1-free": "Laguna S 2.1 (gratis)",
    "longcat-2.0-free": "Longcat 2.0 (gratis)",
    "nemotron-3-ultra-free": "Nemotron 3 Ultra (gratis)",
}


def _zen_api_key() -> str:
    env = _load_env(HERMES_ENV)
    key = env.get("ZEN_API_KEY") or env.get("OPENCODE_ZEN_API_KEY") or ""
    if not key:
        raise HTTPException(503, "ZEN_API_KEY saknas i ~/.hermes/.env")
    return key


async def _zen_stream(messages: list[dict], model: str = "big-pickle", max_tokens: int = 1024):
    """Strömma svar från opencode-zen via httpx. Yields SSE-rader."""
    if not HAS_HTTPX:
        yield "data: {\"error\": \"httpx saknas\"}\n\n"
        return
    key = _zen_api_key()
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "stream": True,
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "User-Agent": BROWSER_UA,
    }
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", ZEN_API_URL, json=payload, headers=headers) as resp:
                if resp.status_code != 200:
                    body = (await resp.aread()).decode()[:300]
                    yield f"data: {{\"error\": \"HTTP {resp.status_code}: {body}\"}}\n\n"
                    return
                async for line in resp.aiter_lines():
                    if line.startswith("data:"):
                        yield f"{line}\n\n"
    except Exception as e:
        yield f"data: {{\"error\": \"{type(e).__name__}: {e}\"}}\n\n"


# ClickUp connector
class ClickUpClient:
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.base_url = "https://api.clickup.com/api/v2"
        self._list_id: str | None = None

    def _call(self, method: str, path: str, payload: dict | None = None) -> Any:
        url = f"{self.base_url}{path}"
        headers = {
            "Authorization": self.api_token,
            "Content-Type": "application/json",
        }
        data = json.dumps(payload).encode() if payload else None
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            log.error("ClickUp API error: %s — %s", e.code, e.read().decode()[:200])
            raise

    def get_teams(self) -> list[dict]:
        return self._call("GET", "/team").get("teams", [])

    def get_lists(self, space_id: str | None = None, folder_id: str | None = None) -> list[dict]:
        if folder_id:
            return self._call("GET", f"/folder/{folder_id}/list").get("lists", [])
        if space_id:
            return self._call("GET", f"/space/{space_id}/list").get("lists", [])
        teams = self.get_teams()
        if not teams:
            return []
        team_id = teams[0]["id"]
        spaces = self._call("GET", f"/team/{team_id}/space").get("spaces", [])
        if not spaces:
            return []
        return self.get_lists(space_id=spaces[0]["id"])

    def create_task(self, list_id: str, name: str, description: str = "",
                    priority: int = 3, status: str = "To Do") -> dict:
        payload = {
            "name": name,
            "description": description,
            "priority": priority,
            "status": status,
        }
        return self._call("POST", f"/list/{list_id}/task", payload)

    def update_task(self, task_id: str, **fields) -> dict:
        return self._call("PUT", f"/task/{task_id}", fields)

    def delete_task(self, task_id: str) -> None:
        self._call("DELETE", f"/task/{task_id}")


# Zoho connector
class ZohoCRM:
    def __init__(self, client_id: str, client_secret: str, refresh_token: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self._access_token = self._refresh_access_token()

    def _refresh_access_token(self) -> str:
        data = urllib.parse.urlencode({
            "refresh_token": self.refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
        }).encode()
        req = urllib.request.Request(
            "https://accounts.zoho.eu/oauth/v2/token", data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
        token = body.get("access_token")
        if not token:
            raise RuntimeError(f"Zoho token failed: {body.get('error')}")
        return token

    def _call(self, method: str, path: str, payload: dict | None = None) -> dict:
        url = f"https://www.zohoapis.eu/crm/v6{path}"
        headers = {
            "Authorization": f"Zoho-oauthtoken {self._access_token}",
            "Content-Type": "application/json",
        }
        data = json.dumps(payload).encode() if payload else None
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 401:
                self._access_token = self._refresh_access_token()
                headers["Authorization"] = f"Zoho-oauthtoken {self._access_token}"
                req = urllib.request.Request(url, data=data, method=method, headers=headers)
                with urllib.request.urlopen(req, timeout=30) as resp:
                    return json.loads(resp.read().decode())
            raise

    def create_task(self, subject: str, what_id: str = "", due_date: str = "",
                    status: str = "Not Started", priority: str = "Normal") -> str:
        task = {"Subject": subject, "Status": status, "Priority": priority}
        if what_id:
            task["What_Id"] = what_id
            task["$se_module"] = "Leads"
        if due_date:
            task["Due_Date"] = due_date
        result = self._call("POST", "/Tasks", {"data": [task]})
        return str(result.get("data", [{}])[0].get("details", {}).get("id", ""))

    def get_leads(self, limit: int = 10) -> list[dict]:
        resp = self._call("GET", f"/Leads?per_page={limit}&fields=Company,Last_Name,Email,Full_Name,Lead_Score")
        return resp.get("data", [])


# Auto-detect connectors
def _auto_clickup() -> ClickUpClient | None:
    env = _load_env(CLICKUP_ENV_FILE) or _load_env(ENV_FILE)
    token = env.get("CLICKUP_API_TOKEN") or env.get("CLICKUP_TOKEN")
    if token:
        try:
            client = ClickUpClient(token)
            log.info("ClickUp connected: %s", client.get_teams()[0]["name"])
            return client
        except Exception as e:
            log.error("ClickUp auto-connect failed: %s", e)
    return None


def _auto_zoho() -> ZohoCRM | None:
    env = _load_env(ENV_FILE)
    cid = env.get("ZOHO_CLIENT_ID", "")
    csec = env.get("ZOHO_CLIENT_SECRET", "")
    rtoken = env.get("ZOHO_REFRESH_TOKEN", "")
    if cid and csec and rtoken:
        try:
            client = ZohoCRM(cid, csec, rtoken)
            log.info("Zoho CRM connected")
            return client
        except Exception as e:
            log.error("Zoho auto-connect failed: %s", e)
    return None


# Sync service state
class SyncService:
    def __init__(self):
        self.clickup = _auto_clickup()
        self.zoho = _auto_zoho()
        self.clickup_list_id: str | None = None

    def status(self) -> dict:
        return {
            "clickup_connected": self.clickup is not None,
            "zoho_connected": self.zoho is not None,
            "clickup_list_id": self.clickup_list_id,
        }

    def ensure_clickup_list(self, list_name: str = "Roials Mission Control") -> str | None:
        if not self.clickup:
            return None
        if self.clickup_list_id:
            return self.clickup_list_id
        # Try to find existing
        lists: list[dict] = []
        try:
            lists = self.clickup.get_lists()
            for l in lists:
                if l["name"] == list_name:
                    self.clickup_list_id = l["id"]
                    return self.clickup_list_id
        except Exception:
            pass
        # Otherwise use first list
        if lists:
            self.clickup_list_id = lists[0]["id"]
        return self.clickup_list_id

    def push_to_clickup(self, task: dict) -> dict | None:
        if not self.clickup:
            return None
        list_id = self.ensure_clickup_list()
        if not list_id:
            return None
        priority_map = {"high": 2, "medium": 3, "low": 4}
        return self.clickup.create_task(
            list_id=list_id,
            name=task["title"],
            description=f"Agent: {task.get('assignedTo', '?')} | Category: {task.get('category', '?')}",
            priority=priority_map.get(task.get("priority", "medium"), 3),
            status="To Do" if task.get("status") == "todo" else
                   "In Progress" if task.get("status") == "in-progress" else
                   "Complete",
        )

    def push_to_zoho(self, task: dict) -> str | None:
        if not self.zoho:
            return None
        priority_map = {"high": "High", "medium": "Normal", "low": "Low"}
        status_map = {"todo": "Not Started", "in-progress": "In Progress", "done": "Completed"}
        return self.zoho.create_task(
            subject=task["title"],
            priority=priority_map.get(task.get("priority", "medium"), "Normal"),
            status=status_map.get(task.get("status"), "Not Started"),
        )

    def sync_all(self) -> dict:
        if not KANBAN_TASKS_FILE.exists():
            return {"error": "tasks.json not found"}
        tasks = json.loads(KANBAN_TASKS_FILE.read_text())
        result = {"clickup": [], "zoho": [], "errors": []}
        for task in tasks:
            if self.clickup:
                try:
                    cu = self.push_to_clickup(task)
                    if cu:
                        result["clickup"].append(task["id"])
                except Exception as e:
                    result["errors"].append(f"ClickUp {task['id']}: {e}")
            if self.zoho:
                try:
                    zoho_id = self.push_to_zoho(task)
                    if zoho_id:
                        result["zoho"].append(task["id"])
                except Exception as e:
                    result["errors"].append(f"Zoho {task['id']}: {e}")
        return result


# FastAPI app
if HAS_FASTAPI:
    app = FastAPI(title="Roials Mission Control Sync", version="1.0.0")
    service = SyncService()

    # Allow Kanban frontend to talk to us
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:5174"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root():
        return {"status": "Roials Sync Service running", **service.status()}

    @app.get("/status")
    def status():
        return service.status()

    @app.post("/sync")
    def sync_all():
        return service.sync_all()

    @app.get("/tasks")
    def get_tasks():
        if not KANBAN_TASKS_FILE.exists():
            return []
        return json.loads(KANBAN_TASKS_FILE.read_text())

    @app.post("/tasks")
    def update_tasks(tasks: list[dict]):
        KANBAN_TASKS_FILE.write_text(json.dumps(tasks, indent=2, ensure_ascii=False))
        return {"saved": True, "count": len(tasks)}

    @app.get("/agents")
    def get_agents():
        if not KANBAN_AGENTS_FILE.exists():
            return []
        return json.loads(KANBAN_AGENTS_FILE.read_text())

    @app.post("/agents")
    def update_agents(agents: list[dict]):
        KANBAN_AGENTS_FILE.write_text(json.dumps(agents, indent=2, ensure_ascii=False))
        return {"saved": True, "count": len(agents)}

    @app.get("/clickup/leads")
    def zoho_leads(limit: int = 10):
        if not service.zoho:
            raise HTTPException(503, "Zoho not connected")
        return service.zoho.get_leads(limit)

    @app.get("/chat/models")
    def chat_models():
        return {"models": ZEN_MODELS, "default": "big-pickle"}

    @app.post("/chat")
    async def chat(payload: dict):
        """Proxy till opencode-zen med SSE-streaming. Nyckeln läses server-side."""
        messages = payload.get("messages", [])
        if not messages or not isinstance(messages, list):
            raise HTTPException(400, "messages krävs")
        model = payload.get("model", "big-pickle")
        if model not in ZEN_MODELS:
            model = "big-pickle"
        max_tokens = int(payload.get("max_tokens", 1024))
        return StreamingResponse(
            _zen_stream(messages, model=model, max_tokens=max_tokens),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    def main():
        uvicorn.run(app, host="127.0.0.1", port=9377, log_level="info")

else:
    def main():
        print("fastapi + uvicorn required: pip install fastapi uvicorn")


if __name__ == "__main__":
    main()
