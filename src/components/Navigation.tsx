import { NavLink } from "react-router-dom";

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className = "" }: NavigationProps) {
  // Ensure minimum 44x44px touch targets for mobile accessibility (WCAG 2.1 Level AAA)
  const linkBaseClasses =
    "inline-flex items-center justify-center rounded-full px-4 py-2 min-h-[44px] min-w-[44px] text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:ring-offset-2";
  
  const linkInactiveClasses =
    "border border-[#e2e8f0] bg-white text-slate-600 hover:border-[#2563eb] hover:text-[#2563eb]";
  
  const linkActiveClasses =
    "bg-[#2563eb] text-white border border-[#2563eb]";

  return (
    <nav className={`flex items-center gap-2 ${className}`} aria-label="Main navigation">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `${linkBaseClasses} ${isActive ? linkActiveClasses : linkInactiveClasses}`
        }
        aria-label="Home"
      >
        Home
      </NavLink>
      <NavLink
        to="/monitor"
        className={({ isActive }) =>
          `${linkBaseClasses} ${isActive ? linkActiveClasses : linkInactiveClasses}`
        }
        aria-label="Monitor"
      >
        Monitor
      </NavLink>
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `${linkBaseClasses} ${isActive ? linkActiveClasses : linkInactiveClasses}`
        }
        aria-label="Settings"
      >
        Settings
      </NavLink>
    </nav>
  );
}
