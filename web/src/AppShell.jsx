import React, { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

export default function AppShell(){
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr]">
      {/* Botón hamburguesa solo visible en móvil */}
      <button
        className={`md:hidden fixed top-4 left-4 z-30 bg-izi-panel p-2 rounded-xl border border-slate-800 text-slate-200 shadow-lg transition-opacity duration-200 ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        onClick={()=>setOpen(!open)}
        aria-label="Abrir menú"
      >
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      {/* Aside: menú lateral */}
      <aside className={`bg-[#0b1324] border-b md:border-b-0 md:border-r border-slate-800 p-4 fixed md:static z-20 top-0 left-0 h-full w-64 md:w-auto transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="font-black text-xl mb-4 bg-clip-text text-transparent gradient-izi">IziConnect NEXT</div>
        <nav className="space-y-2">
          <NavLink to="/" end className={({isActive})=> 'block px-3 py-2 rounded-xl '+(isActive?'bg-izi-panel text-white border border-slate-800':'text-slate-300 hover:bg-slate-900')} onClick={()=>setOpen(false)}>Dashboard</NavLink>
          <NavLink to="/cartera" className={({isActive})=> 'block px-3 py-2 rounded-xl '+(isActive?'bg-izi-panel text-white border border-slate-800':'text-slate-300 hover:bg-slate-900')} onClick={()=>setOpen(false)}>Cartera</NavLink>
          <NavLink to="/radar" className={({isActive})=> 'block px-3 py-2 rounded-xl '+(isActive?'bg-izi-panel text-white border border-slate-800':'text-slate-300 hover:bg-slate-900')} onClick={()=>setOpen(false)}>Radar Digital</NavLink>
          <NavLink to="/alertas" className={({isActive})=> 'block px-3 py-2 rounded-xl '+(isActive?'bg-izi-panel text-white border border-slate-800':'text-slate-300 hover:bg-slate-900')} onClick={()=>setOpen(false)}>Alertas</NavLink>
        </nav>
        {/* Botón cerrar menú en móvil */}
        <button
          className="md:hidden mt-8 text-slate-400 hover:text-white"
          onClick={()=>setOpen(false)}
        >Cerrar menú</button>
      </aside>
      {/* Overlay para cerrar menú al hacer click fuera */}
      {open && <div className="fixed inset-0 bg-black/40 z-10 md:hidden" onClick={()=>setOpen(false)}></div>}
      <main className="p-6 pt-16 md:pt-6">
        <Outlet/>
      </main>
    </div>
  )
}
