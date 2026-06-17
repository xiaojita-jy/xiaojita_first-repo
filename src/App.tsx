import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const AddRecord = lazy(() => import('./pages/AddRecord'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Records = lazy(() => import('./pages/Records'));
const Reports = lazy(() => import('./pages/Reports'));
const Budget = lazy(() => import('./pages/Budget'));
const Settings = lazy(() => import('./pages/Settings'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-gray-400 text-sm">加载中...</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          index
          element={
            <Suspense fallback={<Loading />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="add"
          element={
            <Suspense fallback={<Loading />}>
              <AddRecord />
            </Suspense>
          }
        />
        <Route
          path="calendar"
          element={
            <Suspense fallback={<Loading />}>
              <Calendar />
            </Suspense>
          }
        />
        <Route
          path="records"
          element={
            <Suspense fallback={<Loading />}>
              <Records />
            </Suspense>
          }
        />
        <Route
          path="reports"
          element={
            <Suspense fallback={<Loading />}>
              <Reports />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<Loading />}>
              <Settings />
            </Suspense>
          }
        />
        <Route
          path="budget"
          element={
            <Suspense fallback={<Loading />}>
              <Budget />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
