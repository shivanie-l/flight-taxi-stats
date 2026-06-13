import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Overview from './pages/Overview'
import Airlines from './pages/Airlines'
import Airports from './pages/Airports'
import About from './pages/About'

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/airlines" element={<Airlines />} />
          <Route path="/airports" element={<Airports />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-800 mt-16 py-6 text-center text-xs text-slate-600">
        Data: BTS On-Time Performance · Not affiliated with any airline or government agency
      </footer>
    </div>
  )
}
