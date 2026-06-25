from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_scan_text():
    response = client.post(
        "/api/ai/scan",
        json={"text": "Hello world"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "safe" in data
    assert "riskScore" in data

def test_scan_text_truncation():
    from app.core.config import settings
    original_limit = settings.MAX_TEXT_LENGTH
    settings.MAX_TEXT_LENGTH = 10
    try:
        # Prompt injection kw is "system override" (15 chars).
        # If truncated to 10 chars ("system ove"), it will not trigger the keyword detector.
        response = client.post(
            "/api/ai/scan",
            json={"text": "system override"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["safe"] is True
    finally:
        settings.MAX_TEXT_LENGTH = original_limit

