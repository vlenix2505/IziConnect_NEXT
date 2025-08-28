# IziConnect NEXT (Backend + Frontend Tailwind)

Incluye toda la solución: API FastAPI y Frontend React + Vite + Tailwind

## Backend
```bash
cd api
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
Swagger: http://localhost:8000/docs  
Todos los endpoints requieren query param: `IZI-API-KEY=hackaizi-demo`

## Frontend
```bash
cd web
cp .env.example .env   # en Windows: copy .env.example .env
npm install
npm run dev
```
Abre: http://localhost:5173

## Endpoints
- `GET /stats/dashboard` → KPIs (Promotores, Riesgo, Inactivos, Nuevos, Activos), Churn, Afiliación, Nuevas Ventas, Recorrido, Radar Top-3, Recomendaciones.
- `GET /clients?segment=promotor|riesgo|inactivo|nuevo|activo` → Cartera (campos: last_purchase_days, avg_ticket, risk_level, etc.).
- `GET /stats/cartera` → Insight rápido + Vistos recientemente.
- `GET /prospects/search?q=...&region=...&limit=...` → Radar Digital con similarity_score (TF‑IDF + semilla).
- `GET /alerts` → Kanban de alertas.
