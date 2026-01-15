import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
// import { Counter } from "./components/Counter";
import { Demo } from "./components/Demo";
import { Profile } from "./components/Profile";
import "./index.css";

export function App() {
  // Simple path-based routing
  const path = window.location.pathname;
  const isDemoPage = path === "/demo" || path === "/demo/";
  const isProfilePage = path === "/profile" || path === "/profile/";

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center mb-8">
        <div className="flex space-x-6 items-center">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                SpeedTyper
            </h1>
            <a href="/" className={`text-sm hover:text-blue-600 ${path === "/" ? "text-blue-600 font-medium" : "text-gray-600"}`}>
                Home
            </a>
            <a href="/demo" className={`text-sm hover:text-blue-600 ${isDemoPage ? "text-blue-600 font-medium" : "text-gray-600"}`}>
                Game Demo
            </a>
            <a href="/profile" className={`text-sm hover:text-blue-600 ${isProfilePage ? "text-blue-600 font-medium" : "text-gray-600"}`}>
                Profile
            </a>
        </div>
        <div>
            <WalletMultiButton />
        </div>
      </nav>
      
      <main className="px-4 pb-12">
        {isDemoPage ? (
            <Demo />
        ) : isProfilePage ? (
            <Profile />
        ) : (
            <div className="bg-gray-50 p-8 rounded-xl border max-w-2xl mx-auto shadow-sm">
                <header className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Welcome to Typing Speed Game</h1>
                <p className="text-gray-600 mb-6">
                    A decentralized typing game powered by MagicBlock Ephemeral Rollups.
                </p>
                <div className="flex justify-center gap-4">
                    <a href="/demo" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Start Playing (Demo)
                    </a>
                    <a href="/profile" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    View Profile
                    </a>
                </div>
                </header>

                <footer className="text-center mt-12 text-gray-400 text-xs">
                    <p>Powered by MagicBlock + Anchor + Solana</p>
                </footer>
            </div>
        )}
      </main>
    </div>
  );
}

export default App;
