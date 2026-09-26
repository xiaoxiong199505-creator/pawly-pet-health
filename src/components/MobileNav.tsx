import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileHeart, MessageCircleHeart, PawPrint, CalendarPlus } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/record', label: 'Record', icon: FileHeart, end: false },
  { to: '/chat', label: 'Triage', icon: MessageCircleHeart, end: false },
  { to: '/book', label: 'Book', icon: CalendarPlus, end: false },
];

export default function MobileNav() {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-sage-200 bg-sage-50/80 px-4 py-3 backdrop-blur-sm md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-600 text-white">
          <PawPrint className="h-4 w-4" />
        </div>
        <span className="font-display text-base font-semibold text-slate-800">Pawly</span>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-sage-200 bg-white/95 px-2 py-2 backdrop-blur-md md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-sage-600' : 'text-slate-400'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
