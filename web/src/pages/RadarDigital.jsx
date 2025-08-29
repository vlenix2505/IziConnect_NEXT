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
      <div className="card overflow-x-auto p-0">
        <div className="w-full min-w-[800px]">
          <table className="table w-full text-sm">
            <thead>
              <tr>
                <th className="whitespace-nowrap px-4 py-3 w-1/4">Nombre</th>
                <th className="whitespace-nowrap px-4 py-3 w-1/6">Canal/Categoría</th>
                <th className="whitespace-nowrap px-4 py-3 w-1/8">Región</th>
                <th className="whitespace-nowrap px-4 py-3 w-1/12">Score</th>
                <th className="whitespace-nowrap px-4 py-3 w-1/6">Señales</th>
                <th className="whitespace-nowrap px-4 py-3 w-1/8">Reputación</th>
                <th className="whitespace-nowrap px-4 py-3 w-1/12">Web</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p=> (
                <tr key={p.name}>
                  <td className="whitespace-nowrap px-4 py-3">{p.name}</td>
                  <td className="whitespace-nowrap px-4 py-3">{(p.channel||'web')+' / '+(p.category||'-')}</td>
                  <td className="whitespace-nowrap px-4 py-3">{p.region||'-'}</td>
                  <td className="whitespace-nowrap px-4 py-3"><b>{p.similarity_score}</b></td>
                  <td className="whitespace-nowrap px-4 py-3">{(p.has_qr?'QR ':'')+(p.has_link?'LINK ':'')+(p.has_card?'CARD ':'')+(p.delivery?'DEL ':'')}</td>
                  <td className="whitespace-nowrap px-4 py-3">{p.rating?`${p.rating}★ (${p.reviews||0})`:'-'}</td>
                  <td className="whitespace-nowrap px-4 py-3">{p.site ? <a className="text-sky-400" href={p.site} target="_blank">Abrir</a> : (p.website ? <a className="text-sky-400" href={p.website} target="_blank">Abrir</a> : '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-slate-500 text-sm">* Scoring = similitud TF‑IDF (perfil clientes vs. nombre/categoría/handle) + semilla.</p>
    </div>
  )
}
