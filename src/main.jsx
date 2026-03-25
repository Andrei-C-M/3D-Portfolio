import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Entry point: mount the React app into the #root div in index.html.
// StrictMode helps catch issues during development (double-renders, etc.).
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
