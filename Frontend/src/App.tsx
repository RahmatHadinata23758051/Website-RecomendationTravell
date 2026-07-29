export function App() {
  return (
    <div className="min-h-[100dvh] bg-clean-light flex flex-col items-center justify-center p-6 text-center">
      <div className="glass-panel p-8 rounded-3xl max-w-lg shadow-glass border border-slate-200/80">
        <div className="flex justify-center mb-4">
          <img
            src="/assets/images/logos/siger-gold-icon.png"
            alt="Siger Gold Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight mb-2">
          KelanaLampung
        </h1>
        <p className="text-sm font-sans text-primary-600 font-semibold mb-4">
          Jelajah Surga Pariwisata Lampung Berbasis AI
        </p>
        <div className="bg-slate-100 p-4 rounded-2xl text-xs text-slate-600 font-mono mb-4 text-left">
          Status: Frontend Foundation & Design System Ready (Fase 1 Completed)
        </div>
        <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100">
          React 18 + Vite + TypeScript + Tailwind CSS v3
        </span>
      </div>
    </div>
  );
}

export default App;
