import React from 'react'
import { useEffect, useState } from 'react'
import { apiGet } from '../api'

export default function Dashboard(){
  const [data,setData] = useState(null)
  const [err,setErr] = useState(null)
  useEffect(()=>{ apiGet('/stats/dashboard').then(setData).catch(setErr)},[])
  if(err) return <div className="card">Error: {String(err)}</div>
  if(!data) return <div className="card">Cargando...</div>

  const seg = data.segments || {}
  const lbl = data.labels || {}
  const radar = data.radar_top || []
  const recs = data.recommendations || []

  const g = (k)=> seg[k] || 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card"><div className="text-slate-400">{lbl.nuevo||'Nuevos'}</div><div className="knum">{g('nuevo')}</div><div className="text-slate-500">Ventas ↑ • Frecuencia ↑</div></div>
        <div className="card"><div className="text-slate-400">{lbl.promotor||'Promotores'}</div><div className="knum">{g('promotor')}</div><span className="pill-up mt-2">+5%</span><div className="text-slate-500">Ventas ↑ • Frecuencia →</div></div>
        <div className="card"><div className="text-slate-400">{lbl.riesgo||'En riesgo'}</div><div className="knum">{g('riesgo')}</div><span className="pill-down mt-2">-8%</span><div className="text-slate-500">Ventas ↓ • Frecuencia ↓</div></div>
        <div className="card"><div className="text-slate-400">{lbl.inactivo||'Inactivos'}</div><div className="knum">{g('inactivo')}</div><span className="pill-down mt-2">-2%</span><div className="text-slate-500">Ventas ↓ • Frecuencia ↓</div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card"><div className="text-slate-400">Abandono (churn)</div><div className="knum">{(data.churn_rate*100).toFixed(1)}%</div><div className="text-slate-500">Clientes perdidos vs. base total</div></div>
        <div className="card"><div className="text-slate-400">Afiliación</div><div className="knum">{data.altas_mes} altas</div><div className="text-slate-500">Promedio diario</div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card"><div className="text-slate-400">Nuevas ventas</div><div className="knum">{data.nuevas_ventas}</div><div className="text-slate-500">Cierre a la fecha</div></div>
        <div className="card"><div className="text-slate-400">Recorrido de cartera</div><div className="knum">{data.recorrido.visited} / {data.recorrido.target_total}</div><div className="text-slate-500">Visitados este mes</div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-slate-400 mb-2">Radar Digital (Prospectos externos)</div>
          <div className="grid gap-2">
            {radar.map(p => (
              <div key={p.name} className="card p-3">
                <span className="badge">{p.category||'—'}</span>
                <b className="ml-2">{p.name}</b>
                <span className="text-slate-400 ml-2">{p.handle||''}</span>
                <span className="badge float-right">{p.similarity_score}% similitud</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="text-slate-400 mb-2">Alertas y recomendaciones</div>
          <div className="grid gap-2">
            {recs.map((r,idx)=>(
              <div key={idx} className="card p-3 flex items-center justify-between">
                <div>{r.text}</div>
                <button
                  className={
                    'btn ' +
                    (r.action === 'Ver' ? 'bg-blue-600 hover:bg-blue-500' :
                    r.action === 'Explorar' ? 'bg-emerald-600 hover:bg-emerald-500' :
                    r.action === 'Actuar' ? 'bg-orange-600 hover:bg-orange-500' :
                    'bg-sky-500 hover:bg-sky-400')
                  }
                >
                  {r.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
