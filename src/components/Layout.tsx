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
    <div className="min-h-screen pb-16 bg-bg-root">
      <ToastContainer />
      <main className="max-w-lg mx-auto">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(71,85,105,0.15)]"
        style={{
          background: 'rgba(10, 14, 20, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-lg mx-auto flex justify-around">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 text-[10px] transition-colors ${
                  isActive ? 'text-accent font-semibold' : 'text-slate-600 font-medium'
                }`
              }
            >
              <span className="text-lg mb-0.5">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
