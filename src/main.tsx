import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { createBrowserApi } from './data/webApi'

window.appRuntime = window.desktopApi ? 'desktop' : 'web'
window.appApi = window.desktopApi ?? createBrowserApi()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
