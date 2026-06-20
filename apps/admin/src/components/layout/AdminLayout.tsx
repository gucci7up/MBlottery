import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/stores/authStore';
import { Bell, Search } from 'lucide-react';

export function AdminLayout() {
  const { user } = useAuthStore();

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <Search size={16} className="text-slate-500" />
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-slate-700/50 border border-slate-600 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <button className="relative text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700">
              <Bell size={18} />
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase() ?? 'A'}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-white text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-slate-400 text-xs mt-0.5">{user?.branch?.name ?? 'Todos'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
