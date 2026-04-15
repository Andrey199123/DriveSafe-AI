import { NavLink } from "react-router-dom";

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className = "" }: NavigationProps) {
  // Ensure minimum 44x44px touch targets for mobile accessibility (WCAG 2.1 Level AAA)
  const linkBaseClasses =
    "inline-flex items-center justify-center rounded-full px-4 py-2 min-h-[44px] min-w-[44px] text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1a7457]/30 focus:ring-offset-2";
  
  const linkInactiveClasses =
    "border border-[#e8e5de] bg-white text-slate-600 hover:border-[#1a7457] hover:text-[#1a7457]";
  
  const linkActiveClasses =
    "bg-[#1a7457] text-white border border-[#1a7457]";

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
