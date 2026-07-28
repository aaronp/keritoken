import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Layout } from './components/Layout';
import { Compliance } from './routes/Compliance';
import { Governance } from './routes/Governance';
import { Tokens } from './routes/Tokens';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/compliance" replace />} />
          <Route path="compliance" element={<Compliance />} />
          <Route path="governance" element={<Governance />} />
          <Route path="tokens" element={<Tokens />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
