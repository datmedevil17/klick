"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

export const WalletConnectButton = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg opacity-75 group-hover:opacity-100 blur transition duration-200 animate-pulse"></div>
        
        {/* Button wrapper to override styles */}
        <div className="relative">
          <WalletMultiButton 
            style={{
              backgroundColor: "#000",
              color: "#4ade80", // green-400
              border: "1px solid rgba(74, 222, 128, 0.5)",
              fontFamily: "var(--font-share-tech-mono)",
              fontWeight: "bold",
              fontSize: "14px",
              height: "48px",
              padding: "0 24px",
              borderRadius: "0.5rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              boxShadow: "0 0 10px rgba(74, 222, 128, 0.2)",
              transition: "all 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
};
