import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SignInPage from './Pages/Signin'
import Dashboard from './Pages/Dashboard'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignInPage />} />
        <Route path="/chat" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App