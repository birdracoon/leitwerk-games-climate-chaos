"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { NameGenerator } from "@/components/registration/NameGenerator";
import { createSession } from "@/lib/api/client-proxy";

export default function Home() {
  const [playerName, setPlayerName] = useState("Frostiger_Taschenrechner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await createSession(playerName);
      sessionStorage.setItem("leitwerk_token", token);
      sessionStorage.setItem("leitwerk_player", playerName);
      router.push("/game");
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte Backend starten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--background)]">
      <main className="w-full max-w-md">
        <div className="flex justify-center mb-4">
          <Image
            src="/logo-claim-dark.svg"
            alt="Leitwerk"
            width={320}
            height={73}
            className="h-[73px] w-auto"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold text-center text-[#00c853] mb-2">
          Climate Chaos
        </h1>
        <p className="text-center text-[var(--foreground)] mb-8">
          Leitender Haustechniker an der verrückten Schule am Tag der offenen Tür
        </p>
        <div className="bg-[#1a1f26] border border-[#374151] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Wähle dein Pseudonym
          </h2>
          <NameGenerator onNameChange={setPlayerName} />
        </div>
        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}
        <div className="flex gap-4">
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex-1 py-3 bg-[#00c853] text-black font-bold rounded-lg hover:bg-[#00e676] disabled:opacity-50"
          >
            {loading ? "..." : "Spiel starten"}
          </button>
          <a
            href="/leaderboard"
            className="flex-1 py-3 border border-[#374151] text-[var(--foreground)] font-medium rounded-lg text-center hover:bg-[#1a1f26]"
          >
            Leaderboard
          </a>
        </div>
        <p className="text-xs text-[#6b7280] mt-6 text-center">
          Keine personenbezogenen Daten. Session verfällt beim Schließen des Tabs.
        </p>
      </main>
    </div>
  );
}
