"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GameCanvas } from "@/components/game/GameCanvas";
import { HUD } from "@/components/game/HUD";
import { CharacterTexturesProvider, RoomDekoTexturesProvider, DeviceTexturesProvider, FloorTextureProvider, RacingTexturesProvider } from "@/lib/game/CharacterTextures";
import { ChaosEventPopup } from "@/components/game/ChaosEventPopup";
import { MiniLeaderboard } from "@/components/game/MiniLeaderboard";
import { useGameStore } from "@/lib/engine/GameState";
import { createSession, startGame, submitScore } from "@/lib/api/client-proxy";
import { calculateEfficiencyQuotient } from "@/lib/engine/ScoreCalculator";
import { MAX_ENERGY, ROOM_NAMES, BASE_PATH } from "@/lib/constants";
import type { RoomId } from "@/lib/constants";

const GAME_OVER_FLAVOR: Record<string, string> = {
  "overheated:turnhalle": "Der Sportlehrer hat das Völkerball-Spiel abgebrochen – die Bälle haben angefangen zu schmelzen.",
  "overheated:computerraum": "Die GPUs laufen heiß – aber nicht für KI, sondern weil du die Kühlung vergessen hast.",
  "overheated:werkstaette": "Die Ständerbohrmaschine glüht! Die Werkstätte ist jetzt eine Schmiede.",
  "overheated:lehrerzimmer": "Der Kaffeevollautomat hat kapituliert. Die Lehrer auch.",
  "overheated:aula": "Die Eltern fliehen! »Das ist ja heißer als die Schulkonferenz!«",
  "frozen:turnhalle": "Der Stufenbarren ist eingefroren. Die Schüler auch.",
  "frozen:computerraum": "Der Informatiklehrer tippt nicht mehr – seine Finger sind am Keyboard festgefroren.",
  "frozen:werkstaette": "Die Schraubstöcke sind eingefroren. Kein Werkstück bewegt sich mehr.",
  "frozen:lehrerzimmer": "Die roten Kugelschreiber schreiben nicht mehr. Endlich keine Korrekturen!",
  "frozen:aula": "Der Elternabend ist abgesagt – wegen Frostgefahr in der Aula.",
  "asleep:turnhalle": "Statt Liegestütze gibt's jetzt nur noch Liegen.",
  "asleep:computerraum": "Alle schlafen. Endlich mal Ruhe im Serverraum.",
  "asleep:werkstaette": "Sauerstoffmangel in der Werkstätte – der Metallstaub hat den Rest gegeben.",
  "asleep:lehrerzimmer": "Die Lehrer pennen – aber diesmal sind die Schüler nicht schuld.",
  "asleep:aula": "200 Eltern schlafen in der Aula. Es sieht aus wie nach dem Buffet.",
};

function getGameOverFlavor(reason: string | null): string {
  if (!reason) return "Bis zum nächsten Mal!";
  const flavor = GAME_OVER_FLAVOR[reason];
  if (flavor) return flavor;
  if (reason.includes("Blackout")) return "Licht aus, Vorstellung aus.";
  return "Das war knapp – oder auch nicht.";
}

function getGameOverReasonDisplay(reason: string | null): string {
  if (!reason) return "Spiel beendet.";
  const m = reason.match(/^(overheated|frozen|asleep):([a-z]+)$/);
  if (m) {
    const [, state, roomId] = m;
    const roomName = ROOM_NAMES[roomId as RoomId] ?? roomId;
    const labels: Record<string, string> = {
      overheated: "Zu heiß",
      frozen: "Zu kalt",
      asleep: "Keine Luft",
    };
    return `${roomName}: ${labels[state] ?? state}`;
  }
  return reason;
}

export default function GamePage() {
  const router = useRouter();
  const gameOver = useGameStore((s) => s.gameOver);
  const gameOverReason = useGameStore((s) => s.gameOverReason);
  const survivalTimeMs = useGameStore((s) => s.survivalTimeMs);
  const rooms = useGameStore((s) => s.rooms);
  const energyUsed = useGameStore((s) => s.energyUsed);
  const [showIntro, setShowIntro] = useState(true);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    const token = sessionStorage.getItem("leitwerk_token");
    if (!token) {
      router.replace("/");
      return;
    }
  }, [router]);

  const handleStartGame = () => {
    const token = sessionStorage.getItem("leitwerk_token");
    if (!token) return;
    setShowIntro(false);
    startGame(token).catch(() => {});
    useGameStore.getState().startGame();
  };

  const handleRestart = async () => {
    setRestarting(true);
    setRestartError(null);
    const playerName = sessionStorage.getItem("leitwerk_player") ?? "Frostiger_Taschenrechner";
    try {
      const { token } = await createSession(playerName);
      sessionStorage.setItem("leitwerk_token", token);
      useGameStore.getState().reset();
      setRestartKey((k) => k + 1);
      setShowIntro(true);
      setScoreSubmitted(false);
      setSubmitError(null);
    } catch {
      setRestartError("Verbindung fehlgeschlagen. Bitte Backend starten.");
    } finally {
      setRestarting(false);
    }
  };

  const handleBackToHome = () => {
    useGameStore.getState().reset();
    window.location.href = BASE_PATH + "/";
  };

  const handleSubmitScore = async () => {
    const token = sessionStorage.getItem("leitwerk_token");
    if (!token || scoreSubmitted) return;
    const survivalSeconds = Math.floor(survivalTimeMs / 1000);
    const eff = calculateEfficiencyQuotient(rooms, energyUsed, MAX_ENERGY);
    try {
      await submitScore(token, survivalSeconds, eff);
      setScoreSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Fehler");
    }
  };

  return (
    <CharacterTexturesProvider key={restartKey}>
    <RoomDekoTexturesProvider>
    <FloorTextureProvider>
    <RacingTexturesProvider>
    <DeviceTexturesProvider>
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[var(--background)]">
      <HUD />
      <div className="absolute inset-0 top-12">
        <GameCanvas />
      </div>
      <ChaosEventPopup />
      <MiniLeaderboard />
      {showIntro && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1a1f26] p-8 rounded-xl max-w-md text-center border-2 border-red-500 animate-pulse-red shadow-2xl">
            <div className="flex justify-center mb-6">
              <Image
                src={`${BASE_PATH}/logo-claim-dark.svg`}
                alt="Leitwerk"
                width={160}
                height={36}
                className="h-9 w-auto"
              />
            </div>
            <p className="text-red-400 font-mono font-bold text-lg mb-2 animate-typewriter">
              #404: KLIMAANLAGE NICHT GEFUNDEN
            </p>
            <p className="text-[var(--foreground)] text-sm mb-1 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}>
              Die Haustechnik-Planer haben die Klimatechnik und Lüftungstechnik etwas zu kanpp bemessen...
            </p>
            <p className="text-[var(--foreground)] text-sm mb-1 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}>
              ...und heute ist Tag der offenen Tuer.
            </p>
            <p className="text-[#00c853] text-sm font-medium mb-2 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.9s", animationFillMode: "forwards" }}>
              Jetzt haengt alles von dir ab.
            </p>
            <p className="text-amber-400 font-semibold text-base mb-4 opacity-0 animate-fade-in-up border border-amber-500/50 rounded-lg p-3 bg-amber-500/10" style={{ animationDelay: "1s", animationFillMode: "forwards" }}>
              Ziehe die Geräte (Heizung, Kuehlung, Lueftung) aus der Technikzentrale auf die Raeume, um sie zu verbinden. Die Regler erscheinen dann direkt im Raum.
            </p>
            <p className="text-[#00c853] text-sm font-medium mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "1.2s", animationFillMode: "forwards" }}>
              Viel Glück.
            </p>
            <button
              onClick={handleStartGame}
              className="px-8 py-3 bg-[#00c853] text-black font-bold rounded-lg hover:bg-[#00e676] opacity-0 animate-fade-in-up"
              style={{ animationDelay: "1.5s", animationFillMode: "forwards" }}
            >
              Los geht&apos;s!
            </button>
          </div>
        </div>
      )}
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1f26] p-8 rounded-lg max-w-md text-center">
            <div className="flex justify-center mb-4">
              <Image
                src={`${BASE_PATH}/logo-claim-dark.svg`}
                alt="Leitwerk"
                width={80}
                height={18}
                className="h-[18px] w-auto opacity-90"
              />
            </div>
            <h2 className="text-xl font-bold text-red-400 mb-4">Game Over!</h2>
            <p className="text-[var(--foreground)] font-medium mb-2">
              {getGameOverReasonDisplay(gameOverReason)}
            </p>
            <p className="text-sm text-[#00c853] mb-4 italic">
              {getGameOverFlavor(gameOverReason)}
            </p>
            <p className="text-sm text-[#6b7280] mb-6">
              Überlebenszeit: {Math.floor(survivalTimeMs / 60000)}:
              {((survivalTimeMs % 60000) / 1000).toFixed(0).padStart(2, "0")}
            </p>
            {submitError && (
              <p className="text-red-400 text-sm mb-4">{submitError}</p>
            )}
            {!scoreSubmitted ? (
              <button
                onClick={handleSubmitScore}
                className="px-6 py-2 bg-[#00c853] text-black font-medium rounded-lg hover:bg-[#00e676] mb-4"
              >
                Score einreichen
              </button>
            ) : (
              <p className="text-[#00c853] mb-4">Score eingereicht!</p>
            )}
            {restartError && (
              <p className="text-red-400 text-sm mb-4">{restartError}</p>
            )}
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => router.push("/leaderboard")}
                className="px-6 py-2 border border-[#374151] text-[var(--foreground)] rounded-lg hover:bg-[#374151]"
              >
                Leaderboard
              </button>
              <button
                onClick={handleRestart}
                disabled={restarting}
                className="px-6 py-2 bg-[#00c853] text-black font-medium rounded-lg hover:bg-[#00e676] disabled:opacity-50"
              >
                {restarting ? "..." : "Neu starten"}
              </button>
              <button
                onClick={handleBackToHome}
                disabled={restarting}
                className="px-6 py-2 border border-[#00c853] text-[#00c853] rounded-lg hover:bg-[#00c853]/20 disabled:opacity-50"
              >
                Zur Startseite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DeviceTexturesProvider>
    </RacingTexturesProvider>
    </FloorTextureProvider>
    </RoomDekoTexturesProvider>
    </CharacterTexturesProvider>
  );
}
