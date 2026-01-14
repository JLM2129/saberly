import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ModeProvider } from './context/ModeContext';
import Navbar from './components/Navbar';

import Home from './pages/Home';
import Simulacros from './pages/Simulacros';
import SimulacroRunner from './pages/SimulacroRunner';
import ResultadosSimulacro from './pages/ResultadosSimulacro';
import Login from './pages/Login';
import Register from './pages/Register';
import Estadisticas from './pages/Estadisticas';
import DesafioRapido from './pages/DesafioRapido';
import './App.css';

function App() {
  return (
    <ModeProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/simulacros" element={<Simulacros />} />
            <Route path="/desafio-rapido" element={<DesafioRapido />} />
            <Route path="/simulacro/:id" element={<SimulacroRunner />} />
            <Route path="/simulacro/:id/resultados" element={<ResultadosSimulacro />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ModeProvider>
  );
}


export default App;
