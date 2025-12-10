"use client";

import { useState } from "react";
import { RecordAndTranscribe } from "@/components/RecordAndTranscribe";
import type { AudioSource } from "@/hooks/useSegmentedRecorder";
import { Button } from "@/components/ui/button";

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
