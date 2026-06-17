import { NavLink, Outlet } from 'react-router-dom';
import ToastContainer from './Toast';

const tabs = [
  { to: '/', label: '概览', icon: '📊' },
  { to: '/add', label: '记账', icon: '➕' },
  { to: '/calendar', label: '日历', icon: '📅' },
  { to: '/records', label: '流水', icon: '📋' },
  { to: '/reports', label: '报表', icon: '📈' },
  { to: '/settings', label: '我的', icon: '⚙️' },
];

export default function Layout() {
  return (
    <div className="min-h-screen pb-16 bg-paper">
      <ToastContainer />
      <main className="max-w-lg mx-auto">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-border z-50">
        <div className="max-w-lg mx-auto flex justify-around">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`
              }
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="mt-0.5">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
