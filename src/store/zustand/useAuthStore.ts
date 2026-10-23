import { create } from 'zustand';
import { User, UserRole } from '../../types';

interface AuthState {
  currentUser: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  setAuth: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  role: null,
  isAuthenticated: false,

  setAuth: (user: User) =>
    set({
      currentUser: user,
      role: user.role,
      isAuthenticated: true,
    }),

  updateUser: (updates: Partial<User>) =>
    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null,
      role: updates.role || state.role,
    })),

  logout: () =>
    set({
      currentUser: null,
      role: null,
      isAuthenticated: false,
    }),
}));
