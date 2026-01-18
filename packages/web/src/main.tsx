import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider, DebugProvider } from './contexts'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <DebugProvider>
        <App />
      </DebugProvider>
    </AuthProvider>
  </React.StrictMode>,
)
