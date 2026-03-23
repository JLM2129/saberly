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
import Desafios from './pages/Desafios';
import DesafioRapido from './pages/DesafioRapido';
import MillionaireGame from './pages/MillionaireGame';
import BombaDeTiempo from './pages/BombaDeTiempo';
import DesafioRachas from './pages/DesafioRachas';
import DueloMultijugador from './pages/DueloMultijugador';
import TeacherPanel from './pages/TeacherPanel';
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
            <Route path="/desafios" element={<Desafios />} />
            <Route path="/desafio-rapido" element={<DesafioRapido />} />
            <Route path="/millionaire" element={<MillionaireGame />} />
            <Route path="/bomba-tiempo" element={<BombaDeTiempo />} />
            <Route path="/racha-imbatible" element={<DesafioRachas />} />
            <Route path="/duelo-multijugador" element={<DueloMultijugador />} />
            <Route path="/simulacro/:id" element={<SimulacroRunner />} />
            <Route path="/simulacro/:id/resultados" element={<ResultadosSimulacro />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/teacher-panel" element={<TeacherPanel />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ModeProvider>
  );
}


export default App;
