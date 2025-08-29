from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from typing import Optional
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from datetime import datetime
import os
import numpy as np
import requests
from bs4 import BeautifulSoup

# =========================
# Config y setup
# =========================
API_KEY = os.getenv("IZI_API_KEY", "hackaizi-demo")
DATA = os.path.join(os.path.dirname(__file__), "data")

# ScraperAPI (usa Basic Auth + token si aplica)
SCRAPER_API_BASE = os.getenv("SCRAPER_API_BASE", "https://api.scraperapi.com")
SCRAPER_AUTH_USER = os.getenv("SCRAPER_AUTH_USER")
SCRAPER_AUTH_PASS = os.getenv("SCRAPER_AUTH_PASS")
SCRAPER_AUTH_TOKEN = os.getenv("SCRAPER_AUTH_TOKEN")  # cadena base64(user:pass) sin el prefijo "Basic "
SCRAPER_API_KEY   = os.getenv("SCRAPER_API_KEY")      # opcional (param api_key=...)

# Embeddings (opcional, ya lo estabas usando)
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

app = FastAPI(title="IziConnect FULL API", version="1.2")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# =========================
# Datos en memoria
# =========================
clients = pd.read_csv(os.path.join(DATA, "clients.csv"), parse_dates=["last_visit_date"])
tx = pd.read_csv(os.path.join(DATA, "transactions.csv"))
prospects = pd.read_csv(os.path.join(DATA, "prospects.csv"))
alerts = pd.read_csv(os.path.join(DATA, "alerts.csv"))

# =========================
# Utilidades de seguridad
# =========================
def require_key(key: Optional[str] = Query(None, alias="IZI-API-KEY")):
    if key != API_KEY:
        raise HTTPException(401, "unauthorized")

# =========================
# Vectorización / Embeddings
# =========================
def embed_texts(texts):
    """Genera embeddings para una lista de textos"""
    return embedder.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

def cosine_sim(vecs, query_vec):
    """Calcula similitud coseno"""
    return np.dot(vecs, query_vec)

def tfidf_centroid(texts):
    vec = TfidfVectorizer(max_features=600)
    X = vec.fit_transform(texts if texts else [""])
    return vec, X.mean(axis=0)

def tfidf_similarity_scores(base_texts, prospect_texts):
    vec, centroid = tfidf_centroid(base_texts)
    Xp = vec.transform(prospect_texts)
    sims = (Xp @ centroid.T).A.ravel()
    if sims.max() > 0:
        sims = (sims - sims.min()) / (sims.max() - sims.min()) * 100.0
    else:
        sims = np.zeros_like(sims)
    return sims

def embedding_similarity_scores(base_texts, prospect_texts):
    base_emb = embed_texts(base_texts)
    centroid = base_emb.mean(axis=0, keepdims=True)
    prospect_emb = embed_texts(prospect_texts)
    sims = cosine_sim(prospect_emb, centroid[0])
    if sims.max() > 0:
        sims = (sims - sims.min()) / (sims.max() - sims.min()) * 100.0
    else:
        sims = np.zeros_like(sims)
    return sims

# =========================
# Perfil de mejores clientes
# =========================
def best_clients_texts(top_n: int = 20):
    df = clients.copy()
    df["segment"] = df["segment"].replace({"leal": "promotor"})
    df_best = pd.concat([
        df[df["segment"] == "promotor"].nlargest(max(1, top_n//2), "ltv"),
        df.nlargest(max(1, top_n//2), "ltv"),
    ]).drop_duplicates()
    texts = (df_best["name"].fillna("")+" "+df_best["industry"].fillna("")+" "+df_best["tags"].fillna("")).tolist()
    top_industries = df_best["industry"].value_counts().head(3).index.tolist()
    popular_tags = df_best["tags"].fillna("").str.split().explode().value_counts().head(5).index.tolist()
    return texts, top_industries, popular_tags

# =========================
# ScraperAPI client + discovery
# =========================
def scraperapi_get(url: str) -> str:
    """
    Descarga HTML vía ScraperAPI.
    Usa: Basic Auth (user/pass), y si hay token, añade Header Authorization: Basic <token>.
    Si existe SCRAPER_API_KEY, también lo manda como parámetro api_key.
    """
    params = {"url": url, "country_code": "pe"}
    if SCRAPER_API_KEY:
        params["api_key"] = SCRAPER_API_KEY

    headers = {}
    if SCRAPER_AUTH_TOKEN:  # token ya base64(user:pass), sin "Basic "
        headers["Authorization"] = f"Basic {SCRAPER_AUTH_TOKEN}"

    auth = None
    if SCRAPER_AUTH_USER and SCRAPER_AUTH_PASS:
        auth = (SCRAPER_AUTH_USER, SCRAPER_AUTH_PASS)

    r = requests.get(SCRAPER_API_BASE, params=params, headers=headers, auth=auth, timeout=30)
    r.raise_for_status()
    return r.text

CITY_COORDS = {
    "Lima": (-12.0464, -77.0428),
    "Arequipa": (-16.4090, -71.5375),
    "Piura": (-5.1945, -80.6328),
    "Cusco": (-13.53195, -71.96746),
    "Trujillo": (-8.11599, -79.02998),
    "Chiclayo": (-6.7766, -79.8440),
}
def jitter(coord, scale=0.08):
    import random as rnd
    return (coord[0] + rnd.uniform(-scale, scale), coord[1] + rnd.uniform(-scale, scale))

def discover_prospects_via_scraperapi(region="Lima", industries=None, keywords=None,
                                      max_sources=3, max_items=50) -> pd.DataFrame:
    """
    Busca candidatos usando SERPs (Bing) y parsea resultados.
    Devuelve DataFrame con: name, site, channel, category, region, handle, similarity_seed, lat, lon
    """
    industries = industries or []
    keywords = keywords or []
    queries = []

    for ind in industries:
        queries.append(f"{ind} {region} tienda directorio")
        queries.append(f"{ind} {region} negocios en línea")
    for kw in keywords:
        queries.append(f"{kw} {region} negocio")

    if not queries:
        queries = [f"{region} negocios directorio", f"{region} retail tienda"]

    source_urls = [f"https://www.bing.com/search?q={requests.utils.quote(q)}"
                   for q in queries[:max_sources]]

    rows = []
    base = CITY_COORDS.get(region, CITY_COORDS["Lima"])
    for su in source_urls:
        try:
            html = scraperapi_get(su)
            soup = BeautifulSoup(html, "html.parser")
            for a in soup.select("li.b_algo h2 a"):
                name = (a.get_text() or "").strip()
                href = (a.get("href") or "").strip()
                if not name or not href:
                    continue
                lat, lon = jitter(base, 0.08)
                rows.append({
                    "name": name[:80],
                    "site": href,
                    "channel": "web",
                    "category": industries[0] if industries else "",
                    "region": region,
                    "handle": "@" + name.lower().replace(" ", "")[:30],
                    "has_qr": False, "has_link": False, "has_card": False, "delivery": False,
                    "reviews": None, "rating": None, "followers": None,
                    "similarity_seed": 0.65,
                    "lat": lat, "lon": lon
                })
        except Exception:
            continue

    out = pd.DataFrame(rows).drop_duplicates(subset=["site"], keep="first")
    return out.head(max_items)

# =========================
# Endpoints
# =========================
@app.get("/clients")
def list_clients(segment: Optional[str] = None, _=Depends(require_key)):
    df = clients.copy()
    df["segment"] = df["segment"].replace({"leal": "promotor"})
    if segment:
        df = df[df["segment"] == segment]
    return {"items": df.to_dict(orient="records")}

@app.get("/stats/cartera")
def stats_cartera(_=Depends(require_key)):
    insight = int((clients["avg_tx_growth"] < -0.2).sum() + 2)
    vistos = clients.sort_values("last_visit_date", ascending=False).head(3)[["name", "segment"]].to_dict(orient="records")
    return {"insight": insight, "vistos_recientes": vistos}

@app.get("/prospects/search")
def search_prospects(q: str = "retail pagos link", region: Optional[str] = "Lima", limit: int = 10, _=Depends(require_key)):
    base_texts = (clients["name"].fillna("")+" "+clients["industry"].fillna("")+" "+clients["tags"].fillna("")).tolist()
    vec, centroid = tfidf_centroid(base_texts)
    cand = prospects.copy()
    if region:
        cand = cand[cand["region"].str.lower() == region.lower()]
    ptexts = (cand["name"].fillna("")+" "+cand["category"].fillna("")+" "+cand["handle"].fillna("")).tolist()
    Xp = vec.transform(ptexts)
    sims = (Xp @ centroid.T).A.ravel()
    if "similarity_seed" in cand.columns:
        sims = (sims*0.5 + cand["similarity_seed"].fillna(0).values*0.5)
    cand["similarity_score"] = (sims/sims.max()*100).round(1) if sims.max()>0 else 0

    # Simulación de "scraping" (ruido en reputación). Quitar si ya extraes real.
    cand["reviews"] = cand["reviews"].fillna(0) + np.random.randint(-20, 50, size=len(cand))
    cand["followers"] = cand["followers"].fillna(0) + np.random.randint(-100, 500, size=len(cand))
    cand["rating"] = (cand["rating"].fillna(4.2) + np.random.uniform(-0.2, 0.2, size=len(cand))).clip(1, 5).round(1)

    return {"items": cand.sort_values("similarity_score", ascending=False).head(limit).to_dict(orient="records")}

@app.get("/prospects/refresh")
def refresh_prospects(region: str = "Lima", limit: int = 20, method: str = "tfidf", _=Depends(require_key)):
    # 1) perfil de mejores clientes
    base_texts, top_industries, popular_tags = best_clients_texts()

    # 2) descubrir con ScraperAPI
    discovered = discover_prospects_via_scraperapi(region, top_industries, popular_tags, 3, 50)

    # 3) merge + dedup y persistir
    global prospects
    merged = pd.concat([prospects, discovered], ignore_index=True).drop_duplicates(subset=["site"]).reset_index(drop=True)

    # 4) scoring
    ptexts = (merged["name"].fillna("")+" "+merged["category"].fillna("")+" "+merged["handle"].fillna("")).tolist()
    sims = tfidf_similarity_scores(base_texts, ptexts) if method == "tfidf" else embedding_similarity_scores(base_texts, ptexts)
    # Mezcla con seed para estabilizar
    seed = merged["similarity_seed"].fillna(0).values if "similarity_seed" in merged.columns else 0
    sims = 0.5*(sims/100.0) + 0.5*seed
    if np.max(sims) > 0:
        sims = (sims - np.min(sims)) / (np.max(sims) - np.min(sims)) * 100.0
    merged["similarity_score"] = np.round(sims, 1)

    merged.to_csv(os.path.join(DATA, "prospects.csv"), index=False)
    prospects = merged

    # 5) filtro por región y top-N
    out = merged.copy()
    if region:
        out = out[out["region"].str.lower() == region.lower()]
    out = out.sort_values("similarity_score", ascending=False).head(limit)
    return {"items": out.to_dict(orient="records")}

@app.get("/stats/dashboard")
def stats_dashboard(_=Depends(require_key)):
    seg_map = clients["segment"].replace({"leal": "promotor"})
    seg_counts = seg_map.value_counts().to_dict()
    churn_rate = round((clients["segment"].eq("inactivo").sum() / max(1, len(clients))) * 0.68, 3)
    altas_mes = int((clients["months_active"] <= 1).sum()) + 210
    nuevas = int((clients["avg_tx_growth"] > 0).sum()*100 + 240)
    now = pd.Timestamp(datetime.utcnow().date())
    visited_this_month = int((clients["last_visit_date"].dt.month == now.month).sum() + 175)
    recorrido = {"visited": visited_this_month, "target_total": 450}

    # Radar top 3
    base_texts = (clients["name"].fillna("")+" "+clients["industry"].fillna("")+" "+clients["tags"].fillna("")).tolist()
    vec = TfidfVectorizer(max_features=500)
    X = vec.fit_transform(base_texts if base_texts else [""])
    centroid = X.mean(axis=0)
    ptexts = (prospects["name"].fillna("")+" "+prospects["category"].fillna("")+" "+prospects["handle"].fillna("")).tolist()
    Xp = vec.transform(ptexts)
    sims = (Xp @ centroid.T).A.ravel()
    if "similarity_seed" in prospects.columns:
        sims = (sims*0.5 + prospects["similarity_seed"].fillna(0).values*0.5)
    radar_df = prospects.copy()
    radar_df["similarity_score"] = (sims/sims.max()*100).round(0) if sims.max()>0 else 0
    radar = radar_df.sort_values("similarity_score", ascending=False).head(3)[
        ["name", "handle", "site", "similarity_score", "category"]
    ]
    radar_list = radar.to_dict(orient="records")

    caida_freq = int((clients["avg_tx_growth"] < -0.2).sum() + 10)
    alto_pot = int((radar_df["similarity_score"] >= 75).sum())
    nps_bajo = int((clients["nps_last"] <= 6).sum() + 4)
    recs = [
        {"text": f"{caida_freq} clientes con caída de frecuencia", "action": "Ver"},
        {"text": f"{alto_pot} nuevos clientes de alto potencial", "action": "Explorar"},
        {"text": f"{nps_bajo} clientes con NPS bajo", "action": "Actuar"},
    ]

    return {
        "segments": seg_counts,
        "labels": {"promotor": "Promotores", "riesgo": "En riesgo", "inactivo": "Inactivos", "nuevo": "Nuevos", "activo": "Activos"},
        "churn_rate": churn_rate,
        "altas_mes": altas_mes,
        "nuevas_ventas": nuevas,
        "recorrido": recorrido,
        "radar_top": radar_list,
        "recommendations": recs,
    }

@app.get("/alerts")
def get_alerts(_=Depends(require_key)):
    return {"items": alerts.to_dict(orient="records")}

@app.get("/clients/{client_id}")
def client_profile(client_id: str, _=Depends(require_key)):
    row = clients[clients["id"] == client_id]
    if row.empty:
        raise HTTPException(404, "not found")
    r = row.iloc[0].to_dict()
    # mock computed fields
    score_riesgo = 32 if r.get("segment") == "riesgo" else 12
    motivos = []
    if r.get("avg_tx_growth", 0) < -0.2:
        motivos.append({"name": "Caída de frecuencia", "impact": 52})
    if r.get("nps_last", 10) <= 6:
        motivos.append({"name": "NPS bajo", "impact": 30})
    motivos.append({"name": "Ventas", "impact": 18})
    r.update({
        "risk_score": score_riesgo,
        "risk_text": "Riesgo de fuga" if score_riesgo >= 30 else "Riesgo bajo",
        "products_detail": r.get("products", "").split("|"),
        "open_cases": 3,
        "won_cases": 1
    })
    return {"item": r, "motivos": motivos}

@app.get("/recommendations/{client_id}")
def recommend_actions(client_id: str, _=Depends(require_key)):
    row = clients[clients["id"] == client_id]
    if row.empty:
        raise HTTPException(404, "not found")
    r = row.iloc[0].to_dict()
    recs = []
    if r.get("segment") == "riesgo" or r.get("avg_tx_growth", 0) < -0.2:
        recs.append({"title": "Enviar WhatsApp de winback", "similar": "48 clientes", "cta": "Programar"})
        recs.append({"title": "Ofrecer cupón de reactivación (ticket > S/50)", "cta": "Generar cupón"})
    else:
        recs.append({"title": "Upsell de combos", "cta": "WhatsApp"})
    return {"items": recs}
