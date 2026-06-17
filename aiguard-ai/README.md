# AIGuard Control Tower - AI Security Microservice

Microservice xử lý phân tích dữ liệu văn bản, phát hiện PII, Token, API Key và Prompt Injection trước khi người dùng gửi cho các LLM như ChatGPT, Gemini.

## Cấu trúc thư mục (Skeleton)

- `app/api/`: Chứa các API routers.
- `app/core/`: Chứa các file cấu hình (config, biến môi trường).
- `app/schemas/`: Chứa các Pydantic models (Request/Response).
- `app/detectors/`: Chứa logic phân tích (Regex, Llama Guard).
- `app/services/`: Chứa các Business Logic (thêm sau này).
- `models/`: Thư mục chứa model ML (tùy chọn tải về).
- `tests/`: Thư mục chứa Unit test.

## Cài đặt và Chạy môi trường Dev

1. Cài đặt Python 3.10+
2. Tạo Virtual Environment và kích hoạt:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Trên Linux/Mac
   venv\Scripts\activate     # Trên Windows
   ```
3. Cài đặt thư viện:
   ```bash
   pip install -r requirements.txt
   ```
4. Khởi chạy Server:
   ```bash
   uvicorn app.main:app --reload
   ```
5. Mở Swagger UI tại: [http://localhost:8000/docs](http://localhost:8000/docs)

## Chạy Unit Test

```bash
pytest
```

## Chạy bằng Docker

```bash
docker build -t aiguard-ai .
docker run -p 8000:8000 aiguard-ai
```

## Ghi chú dependency

`requirements.txt` chỉ chứa các gói nhẹ cần để chạy demo FastAPI scanner.
Các gói ML nặng để load Llama Guard thật được tách sang:

```bash
pip install -r requirements-ml.txt
```
