import React from "react";
import { ArrowLeft, Gauge, Waves, Layers, Target, BadgeCheck } from "lucide-react";

interface BlindTunnelPageProps {
  onBack: () => void;
}

/**
 * The Blind Tunnel — long-form reference page on integrated loudness (LUFS),
 * loudness range (LRA), saturation and density.
 *
 * Editorial content written by the YourSongScore team. Formatting only:
 * brand canvas #0A0B0E, Inter 14px body / Inter 20px headings.
 */

const BODY: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontSize: "14px",
  lineHeight: "22px",
  color: "#cad5e2",
};

const H2: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontSize: "20px",
  lineHeight: "28px",
};

const CARD =
  "bg-[#13161C] border border-white/10 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl flex flex-col gap-5";
const GLOW =
  "absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none";

function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <h2
      className="font-bold text-white tracking-tight flex items-center gap-2.5 relative z-10"
      style={H2}
    >
      <Icon className="w-5 h-5 text-[#bd93f9] shrink-0" />
      <span>{children}</span>
    </h2>
  );
}

function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p style={BODY}>
      <strong className="text-white">{label}</strong> {children}
    </p>
  );
}

export default function BlindTunnelPage({ onBack }: BlindTunnelPageProps) {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="flex flex-col gap-8 font-sans animate-fadeIn max-w-4xl mx-auto text-left"
      id="blind-tunnel-page-container"
      style={{ backgroundColor: "var(--color-brand-bg, #0A0B0E)" }}
    >
      {/* 1. Header navigation — matches the Stacks / Rabbit Hole page pattern */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-500/5 rounded-full blur-[60px] pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={onBack}
            className="p-3 bg-neutral-900/80 hover:bg-white/5 border border-white/5 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-lg hover:scale-105"
            title="Return"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#bd93f9] font-bold flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              <span>the Blind Tunnel</span>
            </span>
            <h1
              className="font-bold text-white tracking-tight mt-0.5"
              style={H2}
            >
              The Misunderstood &minus;14.0
            </h1>
          </div>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs uppercase font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(189,147,249,0.30)] hover:scale-102 self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* 2. Opening */}
        <div className={CARD}>
          <div className={GLOW} />
          <div className="relative z-10 flex flex-col gap-4">
            <h2 className="font-bold text-white tracking-tight" style={H2}>
              Integrated Loudness &amp; Dynamic Range
            </h2>
            <h3 className="text-sm font-bold text-[#bd93f9] tracking-tight">
              Normalization vs. Commercial Reality
            </h3>

            <p
              className="font-bold text-white border-l-2 border-[#bd93f9]/50 pl-4 py-1 bg-[#bd93f9]/5 rounded-r"
              style={BODY}
            >
              The &minus;14 LUFS target is widely misunderstood, and chasing it
              without understanding what normalization actually does and
              doesn&rsquo;t equalize can lead to weak-sounding, miscalibrated
              masters from independent artists.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <BadgeCheck className="w-4 h-4 text-[#00d492] shrink-0" />
              <span
                className="font-mono uppercase tracking-widest font-bold text-[#00d492]"
                style={{ fontSize: "10px" }}
              >
                Written by the YSS team, not AI
              </span>
            </div>
          </div>
        </div>

        {/* 3. How normalizers work */}
        <div className={CARD}>
          <div className={GLOW} />
          <div className="relative z-10 flex flex-col gap-4">
            <SectionHeading icon={Waves}>How Normalizers Work</SectionHeading>
            <p style={BODY}>
              Streaming services like Spotify turn down a high-density song
              mastered at &minus;8 LUFS by about 6&nbsp;dB, while maintaining a
              song mastered at &minus;14 LUFS at full volume. This sounds like it
              levels the playing field on raw playback volume &mdash; and on that
              narrow point, it genuinely does. What it doesn&rsquo;t level is
              everything else that makes a master sound strong.
            </p>
          </div>
        </div>

        {/* 4. LRA */}
        <div className={CARD}>
          <div className={GLOW} />
          <div className="relative z-10 flex flex-col gap-4">
            <SectionHeading icon={Layers}>LRA &mdash; Loudness Range</SectionHeading>
            <p style={BODY}>
              Loudness Range (LRA) is an audio measurement that quantifies the
              difference between the softest and loudest parts of a recording.
              Rather than looking at absolute peak levels, LRA analyzes the
              distribution of loudness over time, focusing on the main range
              where the majority of your audio&rsquo;s volume resides.
            </p>
            <p style={BODY}>
              Spotify&rsquo;s loudness normalization uses a target of &minus;14
              dB integrated LUFS, which adjusts a track&rsquo;s overall volume
              but does not alter its internal dynamic range (LRA). By simply
              turning the track&rsquo;s gain up or down, the loudest and quietest
              parts maintain their relative volume differences, preserving the
              music&rsquo;s intentional micro-dynamics.
            </p>
            <p
              className="font-bold text-white border-l-2 border-amber-500/50 pl-4 py-1 bg-amber-500/5 rounded-r"
              style={BODY}
            >
              Loudness Range (LRA) is the direct mathematical inverse of
              saturation and density. As you increase saturation and density in a
              mix, your LRA automatically shrinks.
            </p>

            <div className="flex flex-col gap-3 pt-1">
              <h3 className="text-sm font-bold text-[#bd93f9]">
                Saturation Directly Compresses LRA
              </h3>
              <p style={BODY}>
                Saturation introduces soft-clipping, which shaves off transient
                peaks and boosts low-level harmonics.
              </p>
              <Term label="The Process:">
                It pulls the quietest details up and pushes the loudest peaks
                down.
              </Term>
              <Term label="The Result:">
                This squashes the distance between the loudest and softest parts
                of your track, lowering your LRA.
              </Term>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              <h3 className="text-sm font-bold text-[#bd93f9]">
                Density Fills the Sonic Space
              </h3>
              <p style={BODY}>
                Density refers to how &ldquo;full&rdquo; or packed a mix feels
                over time. High density means there are fewer gaps of silence or
                quiet breathing room.
              </p>
              <Term label="The Process:">
                Using tools like upward compression, parallel compression, or
                heavy saturation fills in the microscopic valleys of your
                waveform.
              </Term>
              <Term label="The Result:">
                Because the audio stays consistently full and loud throughout the
                playback, the macro-level volume variations disappear, driving
                the LRA down.
              </Term>
            </div>
          </div>
        </div>

        {/* 5. The balancing act table */}
        <div className={CARD}>
          <div className={GLOW} />
          <div className="relative z-10 flex flex-col gap-4">
            <SectionHeading icon={Layers}>The Balancing Act</SectionHeading>
            <p style={BODY}>
              The relationship between LRA, saturation, and density determines
              the final character of your master:
            </p>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full border-collapse" style={BODY}>
                <thead>
                  <tr className="bg-black/50">
                    {[
                      "Audio Character",
                      "Saturation & Density",
                      "Loudness Range (LRA)",
                      "Sonic Result",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[#bd93f9] font-bold border-b border-white/10"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Dynamic & Open",
                      "Low",
                      "High (10 to 16 LU)",
                      "Punchy transients, highly expressive",
                    ],
                    [
                      "Glue & Warmth",
                      "Moderate",
                      "Balanced (6 to 9 LU)",
                      "Cohesive, controlled peaks, good energy",
                    ],
                    [
                      "Loud & Aggressive",
                      "High",
                      "Low (2 to 5 LU)",
                      "Wall-of-sound effect, intense energy",
                    ],
                  ].map((row, i) => (
                    <tr
                      key={row[0]}
                      className={i % 2 ? "bg-white/[0.02]" : undefined}
                    >
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={`px-4 py-3 align-top border-b border-white/5 ${
                            j === 0 ? "text-white font-bold" : ""
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 6. The illusion */}
        <div className={CARD}>
          <div className={GLOW} />
          <div className="relative z-10 flex flex-col gap-4">
            <SectionHeading icon={Waves}>
              The Saturation and Density Illusion
            </SectionHeading>
            <Term label="Density Survives Normalization Even When Volume Doesn't:">
              Even when turned down to &minus;14 LUFS, a track mastered to
              &minus;8 LUFS carries a dense, compact, unified dynamic profile. It
              sounds saturated, punchy, and modern. A track delivered at
              &minus;10.5 LUFS retains massive wide transient peaks but lacks
              that cohesive, aggressive glue when matched to the same volume.
              This is the real trade-off &mdash; not raw loudness, but density
              and dynamic range (LRA), and it&rsquo;s the part normalization
              cannot touch.
            </Term>
            <Term label="No-Normalization Playback:">
              Loudness normalization can be turned off by listeners, and is
              almost always bypassed in live venues, club sound systems, physical
              DJ mixers, and third-party radio. On those systems, a quieter, more
              dynamic master will sound dramatically weaker next to denser
              competitor tracks &mdash; normalization isn&rsquo;t protecting you
              there.
            </Term>
          </div>
        </div>

        {/* 7. Genre-specific */}
        <div className={CARD}>
          <div className={GLOW} />
          <div className="relative z-10 flex flex-col gap-4">
            <SectionHeading icon={Target}>
              The Real Target: It&rsquo;s Genre-Specific, Not Universal
            </SectionHeading>
            <p style={BODY}>
              There is no single universal loudness number that works for every
              genre. A &minus;9.0 to &minus;7.0 LUFS window is the optimal range
              for modern commercial density in loud, dense genres like hip-hop
              and trap &mdash; achieving that competitive punch without squashing
              kick and snare transients into flat, uninspiring lines. But
              applying that same window to an acoustic, indie, or classical track
              would be a mistake &mdash; those genres are correctly,
              intentionally mastered quieter, because dynamic range and breathing
              room matter more than raw density for the way that music works.
            </p>
            <p
              className="font-bold text-white border-l-2 border-amber-500/50 pl-4 py-1 bg-amber-500/5 rounded-r"
              style={BODY}
            >
              The right question was never &ldquo;how do I hit &minus;14&rdquo;
              or &ldquo;how do I hit &minus;8&rdquo; &mdash; it&rsquo;s
              &ldquo;what does my genre&rsquo;s own commercial reality actually
              sound like, and does my master match it.&rdquo;
            </p>

            <h3 className="text-sm font-bold text-[#bd93f9] pt-1">
              Genre-Aware Target Windows
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full border-collapse" style={BODY}>
                <thead>
                  <tr className="bg-black/50">
                    {[
                      "Genre Bucket",
                      "LUFS Target Window",
                      "LRA (Dynamic Range) Target",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[#bd93f9] font-bold border-b border-white/10"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Hip-Hop / Trap / EDM", "−10 to −7 LUFS", "4–8 LU"],
                    ["Pop / Rock / Country", "−12 to −9 LUFS", "6–12 LU"],
                    [
                      "Indie / Acoustic / Singer-Songwriter",
                      "−14 to −11 LUFS",
                      "10–15 LU",
                    ],
                    [
                      "Classical / Jazz / Folk / Ambient",
                      "−18 to −14 LUFS",
                      "15+ LU",
                    ],
                  ].map((row, i) => (
                    <tr
                      key={row[0]}
                      className={i % 2 ? "bg-white/[0.02]" : undefined}
                    >
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={`px-4 py-3 align-top border-b border-white/5 ${
                            j === 0 ? "text-white font-bold" : "font-mono"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 8. The second number */}
        <div className={CARD}>
          <div className={GLOW} />
          <div className="relative z-10 flex flex-col gap-4">
            <SectionHeading icon={Gauge}>
              The Second Number That Actually Matters: Loudness Range (LRA)
            </SectionHeading>
            <p style={BODY}>
              LUFS alone doesn&rsquo;t tell the whole story. Loudness Range (LRA)
              measures how much a track was compressed during mastering &mdash;
              the spread between its quieter and louder sections. A track can sit
              perfectly inside its genre&rsquo;s LUFS window and still be a weak
              master if its LRA is too low (over-compressed, lifeless, squashed
              flat) or too high (under-produced, thin, lacking the density
              listeners expect from that genre).
            </p>
            <p
              className="font-bold text-white border-l-2 border-[#bd93f9]/50 pl-4 py-1 bg-[#bd93f9]/5 rounded-r"
              style={BODY}
            >
              Loudness and density are two different questions, and a real
              assessment has to check both together, not loudness alone.
            </p>
          </div>
        </div>

        {/* 9. How this shows up in YSS */}
        <div className={CARD}>
          <div className={GLOW} />
          <div className="relative z-10 flex flex-col gap-4">
            <SectionHeading icon={BadgeCheck}>
              How This Shows Up in YourSongScore
            </SectionHeading>
            <p style={BODY}>
              LUFS Loudness is treated as a Pass/Fail compliance badge, not a
              graded score &mdash; measured against the artist&rsquo;s real,
              measured loudness value compared to their song&rsquo;s
              genre-appropriate window. A companion badge does the same for
              Loudness Range. Neither factors into a song&rsquo;s numeric
              creative score &mdash; they are compliance facts, displayed
              clearly, separate from creative judgment.
            </p>
          </div>
        </div>

        {/* 10. Glossary */}
        <div className={CARD}>
          <div className={GLOW} />
          <div className="relative z-10 flex flex-col gap-4">
            <SectionHeading icon={Layers}>
              Glossary: Saturation and Density
            </SectionHeading>
            <p style={BODY}>
              In the context of gain staging, mixing, and loudness management,
              saturation and density describe how tightly packed your audio
              signal is, both harmonically and physically. Here is how each term
              is defined when analyzing your overall loudness envelope.
            </p>

            <div className="flex flex-col gap-3 pt-1">
              <h3 className="text-sm font-bold text-[#bd93f9]">
                Saturation: Harmonic Thickness
              </h3>
              <p style={BODY}>
                Saturation is the introduction of controlled distortion,
                mimicking the clipping behavior of analog hardware like tape
                machines, tubes, or transistors.
              </p>
              <Term label="The Core Mechanism:">
                Saturation rounds off the highest volume peaks (soft-clipping)
                while simultaneously generating brand-new frequencies called
                harmonics.
              </Term>
              <Term label="Impact on the Mix:">
                By introducing these new harmonics, it fills in the empty
                frequency space around an instrument. This tricks the human ear
                into perceiving the sound as warmer, thicker, and
                &ldquo;louder,&rdquo; even though its absolute peak volume has
                actually decreased.
              </Term>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              <h3 className="text-sm font-bold text-[#bd93f9]">
                Density: Waveform Compactness
              </h3>
              <p style={BODY}>
                Density refers to the ratio of average energy to peak energy over
                time. It is a measure of how continuous and uninterrupted the
                sound energy is within your waveform.
              </p>
              <Term label="The Core Mechanism:">
                High density means the &ldquo;valleys&rdquo; (the quiet moments,
                decays, and spaces between notes) are compressed and lifted to
                sit right alongside the &ldquo;peaks&rdquo; (the initial
                transient hits, like a snare crack).
              </Term>
              <Term label="Impact on the Mix:">
                A dense mix has very little breathing room. It creates a solid
                &ldquo;wall of sound&rdquo; where the speakers are constantly
                pushed forward, maximizing the average perceived loudness (RMS or
                Short-Term LUFS) across the entire playback.
              </Term>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              <h3 className="text-sm font-bold text-[#bd93f9]">The Contrast</h3>
              <p style={BODY}>
                To keep them distinct in a production workflow:
              </p>
              <Term label="Saturation">
                modifies the frequency spectrum by adding harmonic content to
                make things sound physically thicker.
              </Term>
              <Term label="Density">
                modifies the amplitude envelope by eliminating quiet gaps over
                time to make things sound physically closer.
              </Term>
            </div>
          </div>
        </div>

        {/* 11. Byline */}
        <div className="flex items-center justify-center gap-2 pb-4">
          <BadgeCheck className="w-4 h-4 text-[#00d492] shrink-0" />
          <span
            className="font-mono uppercase tracking-widest font-bold text-slate-500"
            style={{ fontSize: "10px" }}
          >
            Written by the YSS team, not AI
          </span>
        </div>
      </div>
    </div>
  );
}
