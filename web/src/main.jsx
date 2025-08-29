import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles/index.css'
import AppShell from './AppShell'
import Dashboard from './pages/Dashboard'
import Cartera from './pages/Cartera'
import Perfil360 from './pages/Perfil360'
import RadarDigital from './pages/RadarDigital'
import Alertas from './pages/Alertas'

const router = createBrowserRouter([
  { path:'/', element:<AppShell/>, children:[
    { index:true, element:<Dashboard/> },
    { path:'cartera', element:<Cartera/> },
    { path:'perfil360/:id', element:<Perfil360/> },
    { path:'radar', element:<RadarDigital/> },
    { path:'alertas', element:<Alertas/> },
  ]}
])

ReactDOM.createRoot(document.getElementById('root')).render(<RouterProvider router={router}/>)
