"use client";

import { useState } from "react";
import { RecordAndTranscribe } from "@/components/RecordAndTranscribe";
import { Button } from "@/components/ui/button";
import { AudioSource } from "@/contents/types/audio.type";

export function RecorderWithSourceSwitcher() {
  const [source, setSource] = useState<AudioSource>("mic");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={source === "mic" ? "default" : "outline"}
          onClick={() => setSource("mic")}
        >
          🎙 マイク
        </Button>
        <Button
          variant={source === "system" ? "default" : "outline"}
          onClick={() => setSource("system")}
        >
          🧩 タブ音声
        </Button>
      </div>

      <RecordAndTranscribe source={source} />
    </div>
  );
}
