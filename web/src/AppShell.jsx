import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'

export default function AppShell(){
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="bg-[#0b1324] border-b md:border-b-0 md:border-r border-slate-800 p-4">
        <div className="font-black text-xl mb-4 bg-clip-text text-transparent gradient-izi">IziConnect NEXT</div>
        <nav className="space-y-2">
          <NavLink to="/" end className={({isActive})=> 'block px-3 py-2 rounded-xl '+(isActive?'bg-izi-panel text-white border border-slate-800':'text-slate-300 hover:bg-slate-900')}>Dashboard</NavLink>
          <NavLink to="/cartera" className={({isActive})=> 'block px-3 py-2 rounded-xl '+(isActive?'bg-izi-panel text-white border border-slate-800':'text-slate-300 hover:bg-slate-900')}>Cartera</NavLink>
          <NavLink to="/radar" className={({isActive})=> 'block px-3 py-2 rounded-xl '+(isActive?'bg-izi-panel text-white border border-slate-800':'text-slate-300 hover:bg-slate-900')}>Radar Digital</NavLink>
          <NavLink to="/alertas" className={({isActive})=> 'block px-3 py-2 rounded-xl '+(isActive?'bg-izi-panel text-white border border-slate-800':'text-slate-300 hover:bg-slate-900')}>Alertas</NavLink>
        </nav>
      </aside>
      <main className="p-6">
        <Outlet/>
      </main>
    </div>
  )
}
