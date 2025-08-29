import React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../api'

export default function Cartera(){
  const [data,setData] = useState(null)
  const [stats,setStats] = useState(null)
  const [segment,setSegment] = useState('')
  const [err,setErr] = useState(null)
  const navigate = useNavigate()

  const load = ()=> {
    apiGet('/clients'+(segment?`?segment=${segment}`:''))
      .then(setData).catch(setErr)
    apiGet('/stats/cartera').then(setStats).catch(console.error)
  }

  useEffect(()=>{ load() }, [segment])

  const items = data?.items || []
  const vistos = stats?.vistos_recientes || []
  const insight = stats?.insight || 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <div>
        <div className="card mb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <b>Cartera de clientes</b>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost bg-blue-900/60 text-blue-200" onClick={()=>setSegment('')}>Todos</button>
              <button className="btn-ghost bg-emerald-900/60 text-emerald-200" onClick={()=>setSegment('promotor')}>Promotores</button>
              <button className="btn-ghost bg-orange-900/60 text-orange-200" onClick={()=>setSegment('riesgo')}>En riesgo</button>
              <button className="btn-ghost bg-slate-800/80 text-slate-200" onClick={()=>setSegment('inactivo')}>Inactivos</button>
              <button className="btn-ghost bg-indigo-900/60 text-indigo-200" onClick={()=>setSegment('nuevo')}>Nuevos</button>
            </div>
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Industria</th><th>Segmento</th><th>Productos</th><th>Últ. compra</th><th>Ticket prom.</th><th>Riesgo</th></tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id}>
                  <td
                    className="whitespace-nowrap cursor-pointer hover:underline text-blue-600 hover:text-blue-800"
                    onClick={() => navigate(`/perfil360/${c.id}`)}
                  >
                    {c.name}
                  </td>
                  <td>{c.industry}</td>
                  <td><span className="badge">{c.segment}</span></td>
                  <td>{c.products}</td>
                  <td>{c.last_purchase_days===0 ? 'Hoy' : `Hace ${c.last_purchase_days} días`}</td>
                  <td>S/{c.avg_ticket}</td>
                  <td>{c.risk_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-slate-500 mt-2">Mostrando {items.length} resultados</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="card bg-amber-300 text-slate-900">
          <b>Insight rápido</b>
          <div>{insight} clientes con caída de frecuencia esta semana.</div>
        </div>

        <div className="card">
          <b>Vistos recientemente</b>
          <div className="grid gap-2 mt-2">
            {vistos.map((v,i)=>(
              <div key={i} className="card p-2">
                {v.name} <span className="badge ml-2">{v.segment}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <b>Acciones rápidas</b>
          <div className="grid gap-2 mt-2">
            <button className="btn bg-green-700 text-white border-none">WhatsApp a seleccionados</button>
            <button className="btn bg-blue-700 text-white border-none">Enviar NPS masivo</button>
            <button className="btn bg-amber-400 text-slate-900 border-none">Etiquetar segmento</button>
          </div>
        </div>
      </div>
    </div>
  )
}
