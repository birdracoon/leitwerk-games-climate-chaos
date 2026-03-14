"use client";

import { useState, useEffect } from "react";
import { ADJECTIVES, NOUNS } from "@/lib/constants";

export function NameGenerator({
  onNameChange,
}: {
  onNameChange: (name: string) => void;
}) {
  const [adjective, setAdjective] = useState(ADJECTIVES[0]);
  const [noun, setNoun] = useState(NOUNS[0]);

  const fullName = `${adjective}_${noun}`;

  useEffect(() => {
    const randomAdjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    setAdjective(randomAdjective);
    setNoun(randomNoun);
    onNameChange(`${randomAdjective}_${randomNoun}`);
  }, []);

  useEffect(() => {
    onNameChange(fullName);
  }, [fullName]);

  const handleAdjectiveChange = (v: string) => {
    setAdjective(v);
    onNameChange(`${v}_${noun}`);
  };
  const handleNounChange = (v: string) => {
    setNoun(v);
    onNameChange(`${adjective}_${v}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-[var(--foreground)] mb-1">Adjektiv</label>
        <select
          value={adjective}
          onChange={(e) => handleAdjectiveChange(e.target.value)}
          className="w-full bg-[#1a1f26] border border-[#374151] rounded px-3 py-2 text-[var(--foreground)]"
        >
          {ADJECTIVES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-[var(--foreground)] mb-1">Nomen</label>
        <select
          value={noun}
          onChange={(e) => handleNounChange(e.target.value)}
          className="w-full bg-[#1a1f26] border border-[#374151] rounded px-3 py-2 text-[var(--foreground)]"
        >
          {NOUNS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-[#6b7280]">
        Dein Pseudonym: <span className="font-mono text-[#00c853]">{fullName}</span>
      </p>
    </div>
  );
}
