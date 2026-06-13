import re
from typing import Dict, List, Any

# Predefined regex patterns for sensitive data detection
PATTERNS = {
    "Email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
    "Phone": r"(0\d{9})|(\+84\d{9})",
    "CCCD": r"\b\d{12}\b",
    "APIKey": r"(sk-[a-zA-Z0-9]{32,48})|(AKIA[a-zA-Z0-9]{16})",
    "DBUrl": r"(Server=[^;]+;Database=[^;]+;User Id=[^;]+;Password=[^;]+;)|(mongodb\+srv:\/\/[^\s]+)",
    "JWTToken": r"eyJhbGciOi[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+"
}

class RegexScanner:
    def __init__(self):
        self.compiled_patterns = {name: re.compile(pat) for name, pat in PATTERNS.items()}

    def scan(self, text: str) -> List[Dict[str, Any]]:
        findings = []
        for name, pattern in self.compiled_patterns.items():
            for match in pattern.finditer(text):
                findings.append({
                    "dataType": name,
                    "matchedText": match.group(),
                    "startIndex": match.start(),
                    "endIndex": match.end(),
                    "riskWeight": self._get_weight(name)
                })
        return findings

    def _get_weight(self, data_type: str) -> int:
        weights = {
            "Email": 10,
            "Phone": 15,
            "CCCD": 35,
            "APIKey": 70,
            "DBUrl": 75,
            "JWTToken": 70
        }
        return weights.get(data_type, 10)
