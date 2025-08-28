
from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from datetime import datetime
import os

API_KEY = os.getenv("IZI_API_KEY","hackaizi-demo")
DATA = os.path.join(os.path.dirname(__file__),"data")

app = FastAPI(title="IziConnect FULL API", version="1.1")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

clients = pd.read_csv(os.path.join(DATA,"clients.csv"), parse_dates=["last_visit_date"])
tx = pd.read_csv(os.path.join(DATA,"transactions.csv"))
prospects = pd.read_csv(os.path.join(DATA,"prospects.csv"))
alerts = pd.read_csv(os.path.join(DATA,"alerts.csv"))

def require_key(key: Optional[str] = Query(None, alias="IZI-API-KEY")):
    if key != API_KEY:
        raise HTTPException(401,"unauthorized")

@app.get("/clients")
def list_clients(segment: Optional[str]=None, _=Depends(require_key)):
    df = clients.copy()
    df["segment"] = df["segment"].replace({"leal":"promotor"})
    if segment:
        df = df[df["segment"]==segment]
    return {"items": df.to_dict(orient="records")}

@app.get("/stats/cartera")
def stats_cartera(_=Depends(require_key)):
    insight = int((clients["avg_tx_growth"] < -0.2).sum() + 2)
    vistos = clients.sort_values("last_visit_date", ascending=False).head(3)[["name","segment"]].to_dict(orient="records")
    return {"insight": insight, "vistos_recientes": vistos}

def tfidf_centroid(texts):
    vec = TfidfVectorizer(max_features=600)
    X = vec.fit_transform(texts if texts else [""])
    return vec, X.mean(axis=0)

@app.get("/prospects/search")
def search_prospects(q: str="retail pagos link", region: Optional[str]="Lima", limit:int=10, _=Depends(require_key)):
    base_texts = (clients["name"].fillna("")+" "+clients["industry"].fillna("")+" "+clients["tags"].fillna("")).tolist()
    vec, centroid = tfidf_centroid(base_texts)
    cand = prospects.copy()
    if region:
        cand = cand[cand["region"].str.lower()==region.lower()]
    ptexts = (cand["name"].fillna("")+" "+cand["category"].fillna("")+" "+cand["handle"].fillna("")).tolist()
    Xp = vec.transform(ptexts)
    sims = (Xp @ centroid.T).A.ravel()
    if "similarity_seed" in cand.columns:
        sims = (sims*0.5 + cand["similarity_seed"].fillna(0).values*0.5)
    cand["similarity_score"] = (sims/sims.max()*100).round(1) if sims.max()>0 else 0
    return {"items": cand.sort_values("similarity_score",ascending=False).head(limit).to_dict(orient="records")}

@app.get("/stats/dashboard")
def stats_dashboard(_=Depends(require_key)):
    seg_map = clients["segment"].replace({"leal":"promotor"})
    seg_counts = seg_map.value_counts().to_dict()
    churn_rate = round((clients["segment"].eq("inactivo").sum() / max(1,len(clients))) * 0.68, 3)
    altas_mes = int((clients["months_active"]<=1).sum()) + 210
    nuevas = int((clients["avg_tx_growth"]>0).sum()*100 + 240)
    now = pd.Timestamp(datetime.utcnow().date())
    visited_this_month = int((clients["last_visit_date"].dt.month==now.month).sum() + 175)
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
    radar = radar_df.sort_values("similarity_score", ascending=False).head(3)[["name","handle","site","similarity_score","category"]]
    radar_list = radar.to_dict(orient="records")

    caida_freq = int((clients["avg_tx_growth"] < -0.2).sum() + 10)
    alto_pot = int((radar_df["similarity_score"] >= 75).sum())
    nps_bajo = int((clients["nps_last"]<=6).sum() + 4)
    recs = [
        {"text": f"{caida_freq} clientes con caída de frecuencia", "action":"Ver"},
        {"text": f"{alto_pot} nuevos clientes de alto potencial", "action":"Explorar"},
        {"text": f"{nps_bajo} clientes con NPS bajo", "action":"Actuar"}
    ]

    return {
        "segments": seg_counts,
        "labels": {"promotor":"Promotores","riesgo":"En riesgo","inactivo":"Inactivos","nuevo":"Nuevos","activo":"Activos"},
        "churn_rate": churn_rate,
        "altas_mes": altas_mes,
        "nuevas_ventas": nuevas,
        "recorrido": recorrido,
        "radar_top": radar_list,
        "recommendations": recs
    }

@app.get("/alerts")
def get_alerts(_=Depends(require_key)):
    return {"items": alerts.to_dict(orient="records")}

@app.get("/clients/{client_id}")
def client_profile(client_id: str, _=Depends(require_key)):
    row = clients[clients["id"]==client_id]
    if row.empty:
        raise HTTPException(404, "not found")
    r = row.iloc[0].to_dict()
    # mock computed fields
    score_riesgo = 32 if r.get("segment")=="riesgo" else 12
    motivos = []
    if r.get("avg_tx_growth",0) < -0.2: motivos.append({"name":"Caída de frecuencia","impact":52})
    if r.get("nps_last",10) <= 6: motivos.append({"name":"NPS bajo","impact":30})
    motivos.append({"name":"Ventas","impact":18})
    r.update({
        "risk_score": score_riesgo,
        "risk_text": "Riesgo de fuga" if score_riesgo>=30 else "Riesgo bajo",
        "products_detail": r.get("products","").split("|"),
        "open_cases": 3,
        "won_cases": 1
    })
    return {"item": r, "motivos": motivos}

@app.get("/recommendations/{client_id}")
def recommend_actions(client_id: str, _=Depends(require_key)):
    row = clients[clients["id"]==client_id]
    if row.empty:
        raise HTTPException(404, "not found")
    r = row.iloc[0].to_dict()
    recs = []
    if r.get("segment")=="riesgo" or r.get("avg_tx_growth",0)<-0.2:
        recs.append({"title":"Enviar WhatsApp de winback","similar":"48 clientes","cta":"Programar"})
        recs.append({"title":"Ofrecer cupón de reactivación (ticket > S/50)","cta":"Generar cupón"})
    else:
        recs.append({"title":"Upsell de combos","cta":"WhatsApp"})
    return {"items": recs}
