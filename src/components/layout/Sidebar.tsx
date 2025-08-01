import { useState} from "react";
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  FolderOpen,
  Users,
  FileText,
  Clock,
  DollarSign,
  Building,
  Wrench,
  CheckSquare,
  Calendar,
  Settings,
  TrendingUp,
  Folder,
  Grid3X3,
  Shield,
  UserCog,
  PanelLeft
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useHttpAuth } from '@/hooks/useHttpAuth';

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useHttpAuth();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);

  const hasAdminAccess = user?.permissions?.admin === true;

  const navigationItems = [
    {
      section: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
      ]
    },
    {
      section: 'Projects & Tasks',
      items: [
        { name: 'Projects & Workspaces', path: '/projects', icon: FolderOpen },
        { name: 'Tasks', path: '/tasks', icon: CheckSquare },
        { name: 'Time Tracking', path: '/timetracking', icon: Clock },
        { name: 'Calendar', path: '/calendar', icon: Calendar },
      ]
    },
    {
      section: 'Sales & Clients',
      items: [
        { name: 'Clients', path: '/clients', icon: Users },
        { name: 'Sales', path: '/sales', icon: TrendingUp },
        { name: 'Invoices', path: '/invoices', icon: FileText },
        { name: 'Accounting', path: '/accounting', icon: DollarSign },
      ]
    },
    {
      section: 'Company',
      items: [
        { name: 'Employees', path: '/employees', icon: Building },
        { name: 'Departments', path: '/departments', icon: Building },
        { name: 'Parts Inventory', path: '/parts', icon: Wrench },
        { name: 'Settings', path: '/settings', icon: Settings },
      ]
    },
    ...(hasAdminAccess ? [{
      section: 'Administration',
      items: [
        { name: 'Task Management', path: '/administration', icon: Shield },
        { name: 'User Management', path: '/user-management', icon: UserCog },
      ]
    }] : []),
    {
      section: 'Resources',
      items: [
        { name: 'File Manager', path: '/files', icon: Folder },
        { name: 'Suppliers', path: '/suppliers', icon: Grid3X3 },
      ]
    }
  ];

  return (
    <div>
      {/* Sidebar */}
      <aside className={`transition-all duration-300 ${isSidebarVisible ? 'w-68' : 'w-26'}
      bg-white/90 backdrop-blur-xl border-r border-slate-200/60 
        h-full flex flex-col shadow-lg fixed md:relative z-40 `}>

      {/* Toggle Button (inside sidebar) */}
      <div className="absolute top-8 -right-4 z-50">
        <div
          onClick={toggleSidebar}
          className="cursor-pointer p-2 bg-white rounded-full shadow-md border hover:bg-slate-100 transition"
        >
          <PanelLeft className="w-4 h-4 text-slate-600" />
        </div>
      </div>

        {/* Header */}
        <div className="p-6 border-b border-slate-200/60 ">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
            {isSidebarVisible && (
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  AVI CRM
                </h2>
                <p className="text-xs text-slate-500 font-medium">Audio Video Integrations</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-6 space-y-8 overflow-y-auto">
          {navigationItems.map((section) => (
            <div key={section.section}>
              {isSidebarVisible && (
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">
                  {section.section}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  return (
                    <Link key={item.path} href={item.path}>
                      <Button
                        variant="ghost"
                        className={` transition-all duration-300 ${isSidebarVisible ? 'w-full' : 'w-14'} justify-start h-11 flex rounded-xl transition-all duration-200
                          ${isActive
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-800'
                          }`}
                      >
                        <div className={`p-1 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                          <Icon size={16} />
                        </div>
                        {isSidebarVisible && (
                          <span className="font-medium text-sm">{item.name}</span>
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
