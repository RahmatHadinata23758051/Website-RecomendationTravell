import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Sparkles, Heart, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/assets/images/logos/siger-gold-icon.png"
            alt="Siger Gold Logo"
            className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="text-xl font-display font-extrabold tracking-tight text-slate-900 leading-none">
              Kelana<span className="text-primary-600">Lampung</span>
            </span>
            <span className="text-[10px] font-sans font-semibold text-siger-600 tracking-wider uppercase mt-1">
              AI Tourism Guide
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/') ? 'text-primary-600 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Home</span>
          </Link>

          <Link
            to="/explore"
            className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/explore') ? 'text-primary-600 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore</span>
          </Link>

          <Link
            to="/planner"
            className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/planner') ? 'text-primary-600 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-siger-500" />
            <span>AI Planner</span>
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-siger-500 text-white rounded-full uppercase">
              AI
            </span>
          </Link>

          <Link
            to="/favorites"
            className={`text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              isActive('/favorites') ? 'text-primary-600 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Favorite</span>
          </Link>
        </nav>

        {/* Auth Action Buttons / User Dropdown */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-semibold text-slate-800 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <span>{user?.fullName}</span>
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user?.fullName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => openAuthModal('login')}
                className="py-2.5 px-5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-2xl border border-slate-300 hover:border-slate-400 transition-colors"
              >
                Masuk
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="py-2.5 px-5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-2xl shadow-md shadow-primary-600/20 active:scale-[0.98] transition-all"
              >
                Daftar Gratis
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden text-slate-700 p-2 rounded-xl hover:bg-slate-100"
          aria-label="Buka Menu Mobile"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-4 space-y-3">
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-xs font-semibold text-slate-700"
          >
            Home
          </Link>
          <Link
            to="/explore"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-xs font-semibold text-slate-700"
          >
            Explore
          </Link>
          <Link
            to="/planner"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-xs font-semibold text-slate-700"
          >
            AI Planner
          </Link>
          <Link
            to="/favorites"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-xs font-semibold text-slate-700"
          >
            Favorite
          </Link>
          <div className="pt-2 border-t border-slate-100 flex gap-2">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('login');
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl"
                >
                  Masuk
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('register');
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-primary-600 rounded-xl"
                >
                  Daftar Gratis
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-xl"
              >
                Keluar ({user?.fullName})
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
