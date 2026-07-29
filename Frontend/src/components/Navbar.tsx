import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, LogOut, Menu, X, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-6 lg:px-8">
      {/* Floating Pill Navbar Container Matching Mockup */}
      <div className="max-w-7xl mx-auto glass-pill-nav rounded-full px-6 sm:px-8 py-3.5 my-4 flex items-center justify-between transition-all">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/assets/images/logos/siger-gold-icon.png"
            alt="Siger Gold Logo"
            className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
          />
          <span className="text-xl font-display font-extrabold tracking-tight text-[#0D9488]">
            Kelana<span className="text-[#0D9488]">Lampung</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className="flex flex-col items-center group"
          >
            <span
              className={`text-xs font-semibold transition-colors ${
                isActive('/') ? 'text-[#0D9488] font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Home
            </span>
            {isActive('/') && (
              <span className="h-0.5 w-5 bg-[#0D9488] rounded-full mt-1 animate-in fade-in duration-200" />
            )}
          </Link>

          <Link
            to="/explore"
            className="flex flex-col items-center group"
          >
            <span
              className={`text-xs font-semibold transition-colors ${
                isActive('/explore') ? 'text-[#0D9488] font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Explore
            </span>
            {isActive('/explore') && (
              <span className="h-0.5 w-5 bg-[#0D9488] rounded-full mt-1 animate-in fade-in duration-200" />
            )}
          </Link>

          <Link
            to="/planner"
            className="flex flex-col items-center group"
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-semibold transition-colors ${
                  isActive('/planner') ? 'text-[#0D9488] font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                AI Planner
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#E0F2FE] text-[#0284C7] rounded-full uppercase">
                AI
              </span>
            </div>
            {isActive('/planner') && (
              <span className="h-0.5 w-5 bg-[#0D9488] rounded-full mt-1 animate-in fade-in duration-200" />
            )}
          </Link>

          <Link
            to="/favorites"
            className="flex flex-col items-center group"
          >
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-500 transition-colors" />
              <span
                className={`text-xs font-semibold transition-colors ${
                  isActive('/favorites') ? 'text-[#0D9488] font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Favorite
              </span>
            </div>
            {isActive('/favorites') && (
              <span className="h-0.5 w-5 bg-[#0D9488] rounded-full mt-1 animate-in fade-in duration-200" />
            )}
          </Link>
        </nav>

        {/* Right Auth Action Buttons Matching Mockup */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-semibold text-slate-800 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-[#0D9488] text-white flex items-center justify-center text-[10px] font-bold">
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
                className="py-2 px-5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-full border border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Masuk</span>
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="py-2.5 px-6 text-xs font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-full shadow-md shadow-[#0D9488]/20 active:scale-[0.98] transition-all"
              >
                Daftar Gratis
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden text-slate-700 p-2 rounded-full hover:bg-slate-100"
          aria-label="Buka Menu Mobile"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden max-w-7xl mx-auto rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 space-y-3 shadow-xl mb-4">
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
                  className="flex-1 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-full"
                >
                  Masuk
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('register');
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-[#0D9488] rounded-full"
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
                className="w-full py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-full"
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
