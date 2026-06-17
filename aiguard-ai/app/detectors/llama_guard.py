from typing import Dict, Any
from app.core.config import settings

class LlamaGuardClassifier:
    def __init__(self, model_id: str = "meta-llama/Llama-Guard-3-8B"):
        self.model_id = settings.LLAMA_GUARD_MODEL_ID or model_id
        self.enable_real = settings.ENABLE_REAL_LLAMA_GUARD
        self.is_loaded = False
        
        if self.enable_real:
            try:
                import torch
                from transformers import AutoTokenizer, AutoModelForCausalLM
                print(f"Loading real Llama Guard model: {self.model_id}")
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_id)
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_id, 
                    torch_dtype=torch.bfloat16, 
                    device_map="auto"
                )
                self.is_loaded = True
                print("Llama Guard model successfully loaded.")
            except Exception as e:
                print(f"Failed to load real Llama Guard model: {e}. Falling back to simulation.")
                self.enable_real = False
        else:
            print(f"Llama Guard model placeholder initialized using: {self.model_id}")

    def evaluate_prompt(self, prompt: str) -> Dict[str, Any]:
        """
        Evaluates input prompt against Llama Guard safety categories.
        Returns:
            dict containing safety verdict (safe/unsafe) and triggered categories.
        """
        if self.enable_real and self.is_loaded:
            try:
                import torch
                chat = [{"role": "user", "content": prompt}]
                formatted_prompt = self.tokenizer.apply_chat_template(chat, tokenize=False)
                inputs = self.tokenizer([formatted_prompt], return_tensors="pt").to(self.model.device)
                
                with torch.no_grad():
                    output = self.model.generate(**inputs, max_new_tokens=100)
                
                prompt_len = inputs["input_ids"].shape[-1]
                response = self.tokenizer.decode(output[0][prompt_len:], skip_special_tokens=True).strip()
                
                lines = [line.strip() for line in response.split('\n') if line.strip()]
                if lines and lines[0].lower() == "unsafe":
                    triggered = []
                    if len(lines) > 1:
                        categories = [c.strip() for c in lines[1].split(',')]
                        triggered.extend(categories)
                    else:
                        triggered.append("General Unsafe Content")
                    
                    return {
                        "safe": False,
                        "triggeredCategories": triggered,
                        "riskScore": 85,
                        "modelUsed": self.model_id
                    }
                
                return {
                    "safe": True,
                    "triggeredCategories": [],
                    "riskScore": 0,
                    "modelUsed": self.model_id
                }
            except Exception as e:
                print(f"Error evaluating prompt with real Llama Guard: {e}. Falling back to simulation.")
        
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
            "modelUsed": f"{self.model_id} (simulated)"
        }

