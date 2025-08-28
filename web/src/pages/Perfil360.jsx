import React from 'react'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet } from '../api'

export default function Perfil360(){
  const { id } = useParams()
  const nav = useNavigate()
  const [data,setData] = useState(null)
  const [recs,setRecs] = useState([])
  const [err,setErr] = useState(null)

  useEffect(()=>{
    apiGet(`/clients/${id}`).then(setData).catch(setErr)
    apiGet(`/recommendations/${id}`).then(r=>setRecs(r.items||[])).catch(()=>{})
  }, [id])

  if(err) return <div className="card">Error: {String(err)}</div>
  if(!data) return <div className="card">Cargando...</div>

  const c = data.item
  const motivos = data.motivos || []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Perfil 360 • {c.name}</h2>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={()=>nav(-1)}>Volver</button>
          <button className="btn">Acciones masivas</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
        <div className="space-y-3">
          <div className="card grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <div className="text-slate-400">Volumen</div>
              <div className="knum">~S/{c.avg_ticket* (c.ltv/1000|0)}</div>
              <div className="text-slate-500">vs 30d</div>
            </div>
            <div>
              <div className="text-slate-400">Frecuencia de uso</div>
              <div className="knum">{Math.round((c.avg_tx_growth||0)*100)}%</div>
              <div className="text-slate-500">mensual</div>
            </div>
            <div>
              <div className="text-slate-400">NPS</div>
              <div className="knum">{c.nps_last}/10</div>
              <div className="text-slate-500">{c.nps_last<=6?'Detractor':'Promotor'}</div>
            </div>
            <div>
              <div className="text-slate-400">Casos posventa</div>
              <div className="knum">{c.open_cases} abiertos • {c.won_cases} vencido</div>
            </div>
          </div>

          <div className="card">
            <b>Actividad reciente</b>
            <div className="mt-2 space-y-2 text-sm">
              <div className="card p-2">🔔 Disparador de riesgo {c.avg_tx_growth<0? 'alto':'bajo'} • hace 2h</div>
              <div className="card p-2">📞 Teléfono: +51 999 123 456 • Preferencia: WhatsApp</div>
              <div className="card p-2">📝 NPS recibido: {c.nps_last}/10 • hace 1d</div>
              <div className="card p-2">🛒 Última compra: Ticket S/{c.avg_ticket} • hace {c.last_purchase_days}d</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="card">
            <div className="flex items-center justify-between">
              <b>Siguientes pasos recomendados</b>
              <span className="badge">Prioridad: {c.segment==='riesgo'?'Alta':'Media'}</span>
            </div>
            <div className="grid gap-2 mt-2">
              {recs.map((r,i)=>(
                <div key={i} className="card p-3 flex items-center justify-between">
                  <div>✉️ {r.title} {r.similar? <span className='text-slate-400'> (plantilla similar a {r.similar})</span>:null}</div>
                  <button className="btn">{r.cta||'Ejecutar'}</button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <b>Motivos del riesgo</b>
            <div className="mt-2 flex flex-wrap gap-2">
              {motivos.map((m,i)=>(
                <span key={i} className="badge">{m.name} • Impacto {m.impact}%</span>
              ))}
            </div>
          </div>

          <div className="card">
            <b>Alertas vinculadas</b>
            <div className="mt-2 grid gap-2">
              <div className="card p-2">Riesgo alto • Caída de compras 40% <span className="badge ml-2">SLA 24h</span></div>
              <div className="card p-2">NPS bajo • Promotoría -20</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
