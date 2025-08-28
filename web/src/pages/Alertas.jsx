import React from 'react'
import { useEffect, useState } from 'react'
import { apiGet } from '../api'

export default function Alertas(){
  const [data,setData] = useState(null)
  const [err,setErr] = useState(null)

  useEffect(()=>{ apiGet('/alerts').then(setData).catch(setErr)},[])
  if(err) return <div className="card">Error: {String(err)}</div>
  if(!data) return <div className="card">Cargando...</div>

  const items = data.items || []
  const by = (st)=> items.filter(a=>a.status===st)

  const Column = ({title, list}) => (
    <div className="card">
      <b>{title}</b>
      <div className="grid gap-2 mt-2">
        {list.map(a=>(
          <div key={a.id} className="card p-2">
            <div className="badge">{a.type}</div> <b className="ml-2">{a.id}</b>
            <div className="text-slate-400">Motivo: {a.reason} • Prioridad: {a.priority}</div>
            <div className="text-slate-500">Última vez: {a.last_seen}</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Column title="Nuevas" list={by('nuevo')} />
      <Column title="En curso" list={by('progreso')} />
      <Column title="Resueltas" list={by('resuelto')} />
    </div>
  )
}
