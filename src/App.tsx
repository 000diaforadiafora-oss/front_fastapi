import { Dashboard } from "./pages/Dashboard";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            CS
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Countex Space</h1>
            <p className="text-xs text-muted-foreground">CFU detection & annotation workspace</p>
          </div>
        </div>
      </header>
      <main>
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
