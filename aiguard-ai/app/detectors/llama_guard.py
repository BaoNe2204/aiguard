from typing import Dict, Any

class LlamaGuardClassifier:
    def __init__(self, model_id: str = "meta-llama/Llama-Guard-3-8B"):
        self.model_id = model_id
        # Note: In production, load pipeline:
        # self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        # self.model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.bfloat16, device_map="auto")
        self.is_loaded = False
        print(f"Llama Guard model placeholder initialized using: {model_id}")

    def evaluate_prompt(self, prompt: str) -> Dict[str, Any]:
        """
        Evaluates input prompt against Llama Guard safety categories.
        Returns:
            dict containing safety verdict (safe/unsafe) and triggered categories.
        """
        # Simple rule-based simulation of Prompt Injection detection
        unsafe_keywords = ["ignore previous instruction", "bỏ qua quy định", "xuất toàn bộ dữ liệu", "system override"]
        
        triggered = []
        is_unsafe = False
        risk_score = 0
        
        lower_prompt = prompt.lower()
        for kw in unsafe_keywords:
            if kw in lower_prompt:
                is_unsafe = True
                triggered.append("Prompt Injection / Privilege Escalation")
                risk_score = 60
                break

        return {
            "safe": not is_unsafe,
            "triggeredCategories": triggered,
            "riskScore": risk_score,
            "modelUsed": self.model_id
        }
