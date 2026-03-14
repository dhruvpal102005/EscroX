import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import ContractPage from './pages/ContractPage'
import NewContract from './pages/NewContract'
import IntegrationPage from './pages/IntegrationPage'

function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <div className="pt-16">
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/contract/:id" element={<ContractPage />} />
                    <Route path="/new-contract" element={<NewContract />} />
                    <Route path="/integration" element={<IntegrationPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    )
}

export default App
