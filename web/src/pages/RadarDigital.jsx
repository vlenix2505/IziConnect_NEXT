import React from 'react'
import { useEffect, useState } from 'react'
import { apiGet } from '../api'

export default function RadarDigital(){
  const [data,setData] = useState(null)
  const [err,setErr] = useState(null)
  const [loading,setLoading] = useState(true)
  const [region,setRegion] = useState('Lima')
  const [method,setMethod] = useState('tfidf')

  const fetchProspects = ()=>{
    setLoading(true)
    apiGet(`/prospects/refresh?region=${encodeURIComponent(region)}&limit=20&method=${method}`)
      .then(d=>{ setData(d); setErr(null) })
      .catch(e=> setErr(e))
      .finally(()=> setLoading(false))
  }

  useEffect(()=>{ fetchProspects() }, []) // carga inicial

  const items = data?.items || []

  return (
    <div className="space-y-3">
      <div className="card flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-xl font-bold">Radar Digital</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-400">Región</label>
          <select value={region} onChange={e=>setRegion(e.target.value)}>
            <option>Lima</option><option>Arequipa</option><option>Piura</option>
            <option>Cusco</option><option>Trujillo</option><option>Chiclayo</option>
          </select>
          <label className="text-sm text-slate-400 ml-2">Método</label>
          <select value={method} onChange={e=>setMethod(e.target.value)}>
            <option value="tfidf">TF-IDF (rápido)</option>
            <option value="embedding">Embeddings (semántico)</option>
          </select>
          <button className="btn ml-auto" onClick={fetchProspects}>
            {loading ? 'Buscando...' : 'Buscar de nuevo'}
          </button>
        </div>
      </div>

      {err && <div className="card text-red-300">Error: {String(err)}</div>}

      <div className="card overflow-x-auto p-0">
        <div className="w-full min-w-[800px]">
          <table className="table w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 w-1/4">Nombre</th>
                <th className="px-4 py-3 w-1/6">Canal/Categoría</th>
                <th className="px-4 py-3 w-1/8">Región</th>
                <th className="px-4 py-3 w-1/12">Score</th>
                <th className="px-4 py-3 w-1/6">Métodos de Pago</th>
                <th className="px-4 py-3 w-1/8">Reputación</th>
                <th className="px-4 py-3 w-1/12">Web</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p=> (
                <tr key={p.site || p.name}>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">{(p.channel||'web')+' / '+(p.category||'-')}</td>
                  <td className="px-4 py-3">{p.region||'-'}</td>
                  <td className="px-4 py-3"><b>{p.similarity_score}</b></td>
                  <td className="px-4 py-3">
                    {(p.has_qr?'QR ':'')+(p.has_link?'LINK ':'')+(p.has_card?'CARD ':'')+(p.delivery?'DEL ':'')}
                  </td>
                  <td className="px-4 py-3">{p.rating?`${p.rating}★ (${p.reviews||0})`:'-'}</td>
                  <td className="px-4 py-3">
                    {p.site ? <a className="text-sky-400" href={p.site} target="_blank">Abrir</a> :
                      (p.website ? <a className="text-sky-400" href={p.website} target="_blank">Abrir</a> : '-')}
                  </td>
                </tr>
              ))}
              {items.length===0 && !loading && (
                <tr><td className="px-4 py-6 text-slate-400" colSpan={7}>Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
