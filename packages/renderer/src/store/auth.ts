import { create } from 'zustand';

interface Permission {
  module: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: string;
  avatar?: string;
  permissions: Permission[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  hasPermission: (module: string, action: 'view' | 'add' | 'edit' | 'delete') => boolean;
  canAccess: (path: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem('lexpro_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })(),
  token: localStorage.getItem('lexpro_token'),
  isAuthenticated: !!localStorage.getItem('lexpro_token'),
  loading: false,

  setUser: (user) => {
    if (user) {
      localStorage.setItem('lexpro_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('lexpro_user');
    }
    set({ user, isAuthenticated: !!user });
  },

  setToken: (token) => {
    if (token) {
      localStorage.setItem('lexpro_token', token);
    } else {
      localStorage.removeItem('lexpro_token');
    }
    set({ token, isAuthenticated: !!token });
  },

  logout: () => {
    localStorage.removeItem('lexpro_token');
    localStorage.removeItem('lexpro_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  hasPermission: (module, action) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perm = user.permissions?.find(p => p.module === module);
    if (!perm) return false;
    if (action === 'view') return perm.canView;
    if (action === 'add') return perm.canAdd;
    if (action === 'edit') return perm.canEdit;
    if (action === 'delete') return perm.canDelete;
    return false;
  },

  canAccess: (path) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'admin') return true;
    // خريطة المسارات إلى الوحدات
    const pathModuleMap: Record<string, string> = {
      '/': 'dashboard',
      '/customers': 'customers',
      '/cases': 'cases',
      '/sessions': 'sessions',
      '/announcements': 'announcements',
      '/tasks': 'tasks',
      '/fees': 'fees',
      '/expenses': 'expenses',
      '/templates': 'templates',
      '/notifications': 'notifications',
      '/customer-dossier': 'customers',
      '/court-dossier': 'cases',
      '/settings/backup': 'backup',
      '/settings/courts': 'settings',
      '/settings/case-types': 'settings',
      '/settings/announcement-types': 'settings',
      '/settings/lawyer-profile': 'settings',
      '/users': 'users',
    };
    const module = pathModuleMap[path];
    if (!module) return true;
    return get().hasPermission(module, 'view');
  },
}));
