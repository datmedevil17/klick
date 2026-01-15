import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Counter } from "./components/Counter";
import { Demo } from "./components/Demo";
import "./index.css";

export function App() {
  // Simple path-based routing
  const path = window.location.pathname;
  const isDemoPage = path === "/demo" || path === "/demo/";

  return (
    <>
      <div className="absolute top-5 right-5 z-50">
        <WalletMultiButton />
      </div>
      
      {isDemoPage ? (
        <div className="min-h-screen bg-gray-100 py-12 px-4">
          <div className="mb-4">
            <a href="/" className="text-blue-600 hover:underline text-sm">
              ← Back to Home
            </a>
          </div>
          <Demo />
        </div>
      ) : (
        <div className="bg-gray-50 p-8 rounded-xl border">
          <div className="max-w-2xl mx-auto">
            <header className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Typing Speed Game</h1>
              <p className="text-gray-600 mb-4">
                <a href="/demo" className="text-blue-600 hover:underline">
                  → Go to Demo Page to test all functions
                </a>
              </p>
            </header>

            <main>
              <Counter />
            </main>

            <footer className="text-center mt-8 text-gray-500 text-sm">
              <p>MagicBlock + Anchor + Solana</p>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
