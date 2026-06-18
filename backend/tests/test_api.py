"""API + demo-engine tests. Run from the backend dir: `pytest -q`."""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient  # noqa: E402

from app import demo  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["device"] in {"cpu", "cuda", "mps"}
    assert isinstance(body["demo_mode"], bool)


def test_analyze_and_fetch_roundtrip():
    r = client.post("/api/analyze-video", data={"demo_mode": "true"})
    assert r.status_code == 200
    meta = r.json()["meta"]
    aid = meta["analysis_id"]
    assert aid.startswith("clp_")
    assert meta["n_frames"] == demo.TOTAL_FRAMES

    # full analysis
    r2 = client.get(f"/api/analysis/{aid}")
    assert r2.status_code == 200
    data = r2.json()
    assert len(data["segments"]) == 6
    assert data["sample_frame"]["frame"] == 142

    # per-frame
    r3 = client.get(f"/api/analysis/{aid}/frames/164")
    assert r3.status_code == 200
    fr = r3.json()
    assert fr["frame"] == 164
    assert fr["action"]["label"] == "handoff"
    assert fr["handoff_intent"]["detected"] is True


def test_unknown_analysis_404():
    assert client.get("/api/analysis/nope").status_code == 404
    # fetching a frame for an unknown analysis is also a 404 (consistent contract)
    assert client.get("/api/analysis/nope/frames/0").status_code == 404


def test_frame_out_of_range():
    r = client.post("/api/analyze-video", data={"demo_mode": "true"})
    aid = r.json()["meta"]["analysis_id"]
    assert client.get(f"/api/analysis/{aid}/frames/9999").status_code == 416


def test_model_meta():
    r = client.get("/api/model/meta")
    assert r.status_code == 200
    body = r.json()
    assert len(body["architecture"]) == 5
    assert body["metrics"]["intent_acc"] == 0.892


def test_demo_engine_deterministic():
    a = demo.derive_frame(100)
    b = demo.derive_frame(100)
    assert a.model_dump() == b.model_dump()
    # shapes per the handoff contract
    assert len(a.pose_2d.body) == 17
    assert len(a.pose_2d.hand_right) == 21
    assert len(a.pose_3d.joints_mm) == 17
    assert len(a.trajectory.forecast) == 30


def test_action_scores_sum_close_to_one():
    fr = demo.derive_frame(180)
    assert abs(sum(fr.action.scores.values()) - 1.0) < 0.05


def test_ws_stream_hello_and_seek():
    with client.websocket_connect("/ws/stream") as ws:
        hello = ws.receive_json()
        assert hello["type"] == "hello"
        assert hello["n_frames"] == demo.TOTAL_FRAMES

        first = ws.receive_json()
        assert "frame" in first and "action" in first  # InferenceResult shape

        # seek into the handoff segment; within a few frames the stream lands there
        ws.send_json({"type": "seek", "frame": 190})
        landed = None
        for _ in range(40):
            msg = ws.receive_json()
            if msg.get("frame") == 190:
                landed = msg
                break
        assert landed is not None
        assert landed["action"]["label"] == "handoff"
        assert landed["handoff_intent"]["detected"] is True


def test_model_card():
    r = client.get("/api/model/card")
    assert r.status_code == 200
    body = r.json()
    assert body["license"] == "MIT"
    assert len(body["models"]) == 4
    names = {m["name"] for m in body["models"]}
    assert {"PoseLiftingNet", "ActionTCN", "TrajectoryGRU", "IntentMLP"} == names
    assert body["intended_use"] and body["out_of_scope"] and body["limitations"]
