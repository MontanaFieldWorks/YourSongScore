import React, { useRef, useState } from "react";
import { Upload, Music, AlertCircle, FileAudio, CheckCircle2 } from "lucide-react";

interface UploadSectionProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
  selectedFile: File | null;
}

export default function UploadSection({ onFileSelect, disabled, selectedFile }: UploadSectionProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateAndProcessFile = (file: File) => {
    setErrorMsg(null);

    // Validate MIME type
    if (!file.type.startsWith("audio/") && !file.name.endsWith(".wav") && !file.name.endsWith(".mp3") && !file.name.endsWith(".flac")) {
      setErrorMsg("Invalid format. Please select an audio file (MP3, WAV, FLAC, or AAC).");
      return;
    }

    // Validate size (15MB ceiling for safety)
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMsg("File is too large. Live analysis limit is 15MB for optimal memory consumption.");
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full justify-between">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="audio/*,.wav,.mp3,.flac"
        onChange={handleChange}
        disabled={disabled}
        id="audio-uploader-input"
      />

      <label
        id="drag-drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        htmlFor={disabled ? undefined : "audio-uploader-input"}
        className={`flex-1 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 relative block ${
          isDragActive
            ? "border-blue-500 bg-blue-950/20 text-slate-100 ring-4 ring-blue-500/10"
            : selectedFile
            ? "border-emerald-600 bg-emerald-950/5 text-slate-200"
            : "border-white/10 bg-[#0A0B0E] hover:border-white/20 text-slate-400"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex flex-col items-center gap-4">
          {selectedFile ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full shadow-inner">
              <FileAudio className="w-8 h-8 text-emerald-400" />
            </div>
          ) : (
            <div className={`p-4 rounded-full border transition-colors ${isDragActive ? "bg-blue-500/10 border-blue-500/30" : "bg-[#13161C] border-[#13161C] shadow-inner"}`}>
              <Upload className={`w-8 h-8 ${isDragActive ? "text-blue-500" : "text-slate-500"}`} />
            </div>
          )}

          <div>
            <p className="font-semibold text-slate-200" id="upload-primary-text">
              {selectedFile ? "Audio Loaded Successfully" : "Upload Demo Or Work-In-Progress"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isDragActive
                ? "Drop it here!"
                : selectedFile
                ? selectedFile.name
                : "Drag & drop your MP3 formatting song file or click to browse and add"}
            </p>
          </div>

          {!selectedFile && (
            <span className="text-[11px] px-3 py-1 bg-[#13161C] text-slate-400 font-mono border border-white/5 rounded-full">
              Maximum weight: 15 MB
            </span>
          )}
        </div>
      </label>

      {errorMsg && (
        <div className="flex items-start gap-2 p-3 mt-4 bg-red-950/40 border border-red-500/20 rounded-xl text-xs text-red-400" id="upload-error-display">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {selectedFile && !errorMsg && (
        <div className="flex items-center gap-2 p-3 mt-4 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-400" id="upload-success-display">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="truncate flex-1">
            <span className="font-medium text-neutral-300">File attached: </span>
            <span className="font-mono">{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
          </div>
        </div>
      )}

      {selectedFile && !errorMsg && selectedFile.name.toLowerCase().endsWith(".wav") && (
        <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase font-mono font-extrabold tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Value-Add Stem</span>
            </div>
            <p className="text-xs text-slate-300 font-semibold mt-1.5">Convert heavy WAV to high fidelity 320kbps MP3 Locker? </p>
            <p className="text-[10px] text-slate-500 mt-1">High CBR 320kbps MP3 formatting is highly recommended for multi-device compatibility and optimized streaming analyses.</p>
          </div>
          <button
            onClick={() => {
              const handler = (window as any).onTriggerPremiumWavConversion;
              if (handler) {
                handler(selectedFile);
              }
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/15 hover:scale-102 leading-none text-center"
          >
            Click here to convert your WAV file to a high quality 320kbps MP3
          </button>
        </div>
      )}
    </div>
  );
}
