from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.schemas.scan import ScanRequest, MaskRequest, ScanResponse, MaskResponse
from app.detectors.regex_scan import RegexScanner
from app.detectors.llama_guard import LlamaGuardClassifier
from app.core.config import settings

router = APIRouter()

# Initialize engines
regex_scanner = RegexScanner()
llama_guard = LlamaGuardClassifier()

@router.post("/scan", response_model=ScanResponse)
async def scan_text(request: ScanRequest):
    try:
        text_content = request.text
        # Enforce MAX_TEXT_LENGTH configuration by truncating text content
        if len(text_content) > settings.MAX_TEXT_LENGTH:
            text_content = text_content[:settings.MAX_TEXT_LENGTH]

        # 1. Scan regex patterns
        findings = regex_scanner.scan(text_content)
        
        # 2. Check safety via Llama Guard classifier
        guard_result = llama_guard.evaluate_prompt(text_content)
        
        # Calculate combined risk score
        max_regex_score = max([f["riskWeight"] for f in findings]) if findings else 0
        final_risk_score = max(max_regex_score, guard_result["riskScore"])
        
        is_safe = guard_result["safe"] and final_risk_score < 60

        return {
            "safe": is_safe,
            "riskScore": final_risk_score,
            "findings": findings,
            "triggeredCategories": guard_result["triggeredCategories"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mask", response_model=MaskResponse)
async def mask_text(request: MaskRequest):
    """
    Replaces matched substrings in text with their token labels.
    """
    text_content = request.text
    # Sort findings in descending order of startIndex to avoid index displacement during replacements
    sorted_findings = sorted(request.findings, key=lambda x: x.get("startIndex", 0), reverse=True)
    
    masked_text = text_content
    for finding in sorted_findings:
        start = finding.get("startIndex")
        end = finding.get("endIndex")
        label = finding.get("dataType")
        if start is not None and end is not None:
            mask_label = f"[{label.upper()}]"
            masked_text = masked_text[:start] + mask_label + masked_text[end:]

    return {
        "originalText": request.text,
        "maskedText": masked_text
    }
