from pydantic import BaseModel
from typing import List, Dict, Any

class ScanRequest(BaseModel):
    text: str

class MaskRequest(BaseModel):
    text: str
    findings: List[Dict[str, Any]]

class ScanResponse(BaseModel):
    safe: bool
    riskScore: int
    findings: List[Dict[str, Any]]
    triggeredCategories: List[str]

class MaskResponse(BaseModel):
    originalText: str
    maskedText: str
