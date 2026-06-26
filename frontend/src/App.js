import useStore from "./store/useStore";

function App() {
  const { count, increment, decrement, reset } = useStore();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center gap-8 px-4">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">PriceFlow</h1>
        <p className="mt-2 text-slate-400">
          База фронтенда: React + Tailwind CSS + Zustand
        </p>
      </header>

      <div className="rounded-2xl bg-slate-800 shadow-xl p-8 flex flex-col items-center gap-6 w-full max-w-sm">
        <span className="text-6xl font-mono tabular-nums">{count}</span>

        <div className="flex gap-3">
          <button
            onClick={decrement}
            className="rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95 transition px-5 py-2 font-medium"
          >
            −
          </button>
          <button
            onClick={reset}
            className="rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95 transition px-5 py-2 font-medium"
          >
            Reset
          </button>
          <button
            onClick={increment}
            className="rounded-lg bg-indigo-500 hover:bg-indigo-400 active:scale-95 transition px-5 py-2 font-medium"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
