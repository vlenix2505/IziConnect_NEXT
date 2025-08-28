import React from 'react'
import { useEffect, useState } from 'react'
import { apiGet } from '../api'

export default function RadarDigital(){
  const [data,setData] = useState(null)
  const [err,setErr] = useState(null)
  const [loading,setLoading] = useState(true)

  const fetchProspects = ()=>{
    setLoading(true)
    apiGet('/prospects/search?q=retail pagos link&region=Lima&limit=10')
      .then(d=>{setData(d); setErr(null)})
      .catch(e=> setErr(e))
      .finally(()=> setLoading(false))
  }

  React.useEffect(()=>{ fetchProspects() }, [])

  const items = data?.items || []

  return (
    <div className="space-y-3">
      <div className="card flex items-center justify-between">
        <h2 className="text-xl font-bold">Radar Digital</h2>
        <button className="btn" onClick={fetchProspects}>{loading?'Buscando...':'Buscar de nuevo'}</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th><th>Canal/Categoría</th><th>Región</th><th>Score</th><th>Señales</th><th>Reputación</th><th>Web</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p=> (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{(p.channel||'web')+' / '+(p.category||'-')}</td>
                <td>{p.region||'-'}</td>
                <td><b>{p.similarity_score}</b></td>
                <td>{(p.has_qr?'QR ':'')+(p.has_link?'LINK ':'')+(p.has_card?'CARD ':'')+(p.delivery?'DEL ':'')}</td>
                <td>{p.rating?`${p.rating}★ (${p.reviews||0})`:'-'}</td>
                <td>{p.site ? <a className="text-sky-400" href={p.site} target="_blank">Abrir</a> : (p.website ? <a className="text-sky-400" href={p.website} target="_blank">Abrir</a> : '-')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-slate-500 text-sm">* Scoring = similitud TF‑IDF (perfil clientes vs. nombre/categoría/handle) + semilla.</p>
    </div>
  )
}
