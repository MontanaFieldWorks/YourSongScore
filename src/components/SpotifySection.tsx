import React, { useEffect, useState } from "react";
import { Link, Check, AlertTriangle, Key, HelpCircle } from "lucide-react";

interface SpotifySectionProps {
  spotifyUrl: string;
  setSpotifyUrl: (url: string) => void;
  disabled: boolean;
  onSelectUrl: (url: string) => void;
}

export default function SpotifySection({ spotifyUrl, setSpotifyUrl, disabled, onSelectUrl }: SpotifySectionProps) {
  const [spotifyConfigured, setSpotifyConfigured] = useState(false);
  const [checking, setChecking] = useState(true);
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config-status")
      .then((res) => res.json())
      .then((data) => {
        setSpotifyConfigured(data.spotifyConfigured);
        setChecking(false);
      })
      .catch((err) => {
        console.error("Failed to query config status:", err);
        setChecking(false);
      });
  }, []);

  const validateUrlAndRun = () => {
    setInputError(null);
    if (!spotifyUrl) {
      setInputError("Please enter a Spotify URL first.");
      return;
    }

    const isTrack = spotifyUrl.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
    const isAlbum = spotifyUrl.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]+)/);
    if (!isTrack && !isAlbum) {
      setInputError("Invalid format. Please supply a track or album link (e.g. /track/ or /album/)...");
      return;
    }

    onSelectUrl(spotifyUrl);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled) {
      validateUrlAndRun();
    }
  };

  return (
    <div className="flex flex-col h-full justify-between" id="spotify-container">
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="relative mb-4">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Link className="w-5 h-5 text-neutral-500" />
            </span>
            <input
              type="text"
              placeholder="https://open.spotify.com/track/... or /album/..."
              value={spotifyUrl}
              onChange={(e) => {
                setInputError(null);
                setSpotifyUrl(e.target.value);
              }}
              onKeyDown={handleKeyPress}
              disabled={disabled}
              id="spotify-url-input"
              className="w-full bg-[#0A0B0E] border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-300 shadow-inner"
            />
          </div>

          {inputError && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5" id="spotify-input-error">
              <AlertTriangle className="w-3.5 h-3.5" />
              {inputError}
            </p>
          )}

          <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
            Paste any track or single/album link from Spotify. The server will decrypt the track ID (or resolve the first track if an album link is provided), fetch the 30-second high-fidelity MP3 preview from the Spotify API, and stream it straight to Gemini for an audio-guided master review.
          </p>


        </div>

        {/* Configuration notification panels */}
        <div className="mt-6">
          {checking ? (
            <div className="h-10 bg-neutral-900 animate-pulse rounded-xl" />
          ) : spotifyConfigured ? (
            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs" id="spotify-configured-msg">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-emerald-300">Spotify API Operational</span>
                <span className="text-neutral-400">Full 30-second audio stream critiques are enabled.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4 bg-amber-950/10 border border-amber-500/20 rounded-xl text-xs" id="spotify-warning-msg">
              <div className="flex items-start gap-2.5 text-amber-500">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="font-semibold block text-amber-400">Degraded Sandbox Mode</span>
                  <span className="text-neutral-400 leading-relaxed block mt-0.5">
                    No `SPOTIFY_CLIENT_ID` or `SPOTIFY_CLIENT_SECRET` are configured on the server. Pasting a link will execute a metadata-guided structural critique fallback.
                  </span>
                </div>
              </div>
              
              <div className="pt-2.5 border-t border-neutral-800/40 text-neutral-400 font-sans leading-relaxed text-[11px] flex gap-2">
                <Key className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0 mt-0.5" />
                <div>
                  To activate real preview streams, declare <code className="text-neutral-300 font-mono">SPOTIFY_CLIENT_ID</code> and <code className="text-neutral-300 font-mono">SPOTIFY_CLIENT_SECRET</code> in the <span className="font-medium">Secrets tab</span> at your convenience.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={validateUrlAndRun}
        disabled={disabled || !spotifyUrl}
        id="spotify-analyze-btn"
        className="w-full bg-[#0A0B0E] hover:bg-white/5 border border-white/10 text-slate-200 hover:text-white font-medium py-3 px-4 rounded-xl mt-6 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
      >
        <span>Analyze Spotify Track</span>
      </button>
    </div>
  );
}
