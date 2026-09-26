import { NavLink, Link } from 'react-router-dom';
import { PawPrint, LayoutDashboard, FileHeart, MessageCircleHeart, CalendarPlus } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/record', label: 'Health Record', icon: FileHeart, end: false },
  { to: '/chat', label: 'Triage Chat', icon: MessageCircleHeart, end: false },
  { to: '/book', label: 'Book Vet', icon: CalendarPlus, end: false },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-sage-200 bg-sage-50/60 backdrop-blur-sm">
      <Link to="/" className="flex items-center gap-3 px-6 py-7">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-600 text-white shadow-sm">
          <PawPrint className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-tight text-slate-800">Pawly</p>
          <p className="text-xs text-slate-500">Pet Health</p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-sage-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-sage-100'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-6 py-6">
        <div className="rounded-2xl border border-sage-200 bg-white/60 p-4">
          <p className="text-xs font-medium text-sage-700">A calmer way</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Educational triage guidance. Not a substitute for veterinary care.
          </p>
        </div>
      </div>
    </aside>
  );
}
