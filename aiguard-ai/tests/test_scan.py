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
