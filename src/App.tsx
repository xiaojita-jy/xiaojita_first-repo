import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddRecord from './pages/AddRecord';
import Records from './pages/Records';
import Reports from './pages/Reports';
import Budget from './pages/Budget';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="add" element={<AddRecord />} />
        <Route path="records" element={<Records />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="budget" element={<Budget />} />
      </Route>
    </Routes>
  );
}
