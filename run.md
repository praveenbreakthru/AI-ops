cd "D:\Breakthru All Files\AIops-project\frontend"
npm run dev

cd "D:\Breakthru All Files\AIops-project\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

http://localhost:5173/
http://172.16.13.14:5173


