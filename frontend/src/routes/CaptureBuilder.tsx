import { useEffect, useMemo, useRef, useState } from "react";

// Data Capture / Dataset Builder (/capture)
// Record (webcam) or upload short clips for the self-recorded MVP dataset, attach
// metadata, track per-class progress, preview the manifest row, and export a
// manifest CSV / JSONL. **Everything stays in the browser** — no video is uploaded
// to any server. Recorded clips download to disk; you then place them under
// backend/data/raw/<label>/ and run the CLI (see docs/DATA_CAPTURE_WORKFLOW.md).

const CLASSES = ["idle", "walking", "reaching", "grasping", "placing", "pointing", "handoff"] as const;
type Cls = (typeof CLASSES)[number];
const TARGET = 25; // recommended 20–30 clips/class
const LS_KEY = "ehp.capture.rows.v1";

interface Row {
  video_id: string;
  path: string;
  label: Cls;
  subject_id: string;
  camera_view: string;
  object: string;
  lighting: string;
  notes: string;
  start_time: number;
  end_time: number;
  fps: number;
  num_frames: number;
  source: "webcam" | "upload";
}

const ACCENT: Record<Cls, string> = {
  idle: "#8893a3", walking: "#6fae6f", reaching: "#4d9fff", grasping: "#9b7cff",
  placing: "#ff8a3d", pointing: "#ffd24d", handoff: "#3ddc97",
};

function load(): Row[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const ASSUMED_FPS = 30;

export function CaptureBuilder() {
  const [rows, setRows] = useState<Row[]>(load);
  const [label, setLabel] = useState<Cls>("handoff");
  const [subject, setSubject] = useState("s01");
  const [camera, setCamera] = useState("front");
  const [object, setObject] = useState("cup");
  const [lighting, setLighting] = useState("normal");
  const [notes, setNotes] = useState("");

  const [recording, setRecording] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => localStorage.setItem(LS_KEY, JSON.stringify(rows)), [rows]);
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const counts = useMemo(() => {
    const c = Object.fromEntries(CLASSES.map((k) => [k, 0])) as Record<Cls, number>;
    rows.forEach((r) => (c[r.label] = (c[r.label] || 0) + 1));
    return c;
  }, [rows]);

  const seq = (counts[label] || 0) + 1;
  const baseName = `${subject || "s00"}_${label}_${camera || "front"}_${String(seq).padStart(3, "0")}`;

  function addRow(durationS: number, source: Row["source"], ext: string) {
    const video_id = `${baseName}`;
    setRows((rs) => [
      {
        video_id,
        path: `data/raw/${label}/${video_id}.${ext}`,
        label,
        subject_id: subject || "s00",
        camera_view: camera || "front",
        object,
        lighting,
        notes,
        start_time: 0,
        end_time: Number(durationS.toFixed(2)),
        fps: ASSUMED_FPS,
        num_frames: Math.max(1, Math.round(durationS * ASSUMED_FPS)),
        source,
      },
      ...rs,
    ]);
  }

  async function enableCam() {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamOn(true);
    } catch (e) {
      setCamError("Webcam unavailable or permission denied — use Upload instead.");
    }
  }

  function startRec() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(stream, { mimeType: "video/webm" });
    } catch {
      mr = new MediaRecorder(stream);
    }
    mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    mr.onstop = () => {
      const durationS = (performance.now() - startRef.current) / 1000;
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${baseName}.webm`;
      a.click();
      URL.revokeObjectURL(a.href);
      addRow(durationS, "webcam", "webm");
    };
    recRef.current = mr;
    startRef.current = performance.now();
    mr.start();
    setRecording(true);
  }

  function stopRec() {
    recRef.current?.stop();
    setRecording(false);
  }

  function onUpload(file: File) {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const dur = isFinite(v.duration) ? v.duration : 0;
      const ext = file.name.split(".").pop() || "mp4";
      addRow(dur, "upload", ext);
      URL.revokeObjectURL(url);
    };
    v.src = url;
  }

  function exportCSV() {
    const cols = ["clip_id", "path", "label", "subject_id", "camera_view", "object",
      "fps", "n_frames", "duration_s", "split"];
    const lines = [cols.join(",")];
    for (const r of rows) {
      lines.push([r.video_id, r.path, r.label, r.subject_id, r.camera_view, r.object,
        r.fps, r.num_frames, r.end_time, ""].join(","));
    }
    download("manifest.csv", lines.join("\n") + "\n", "text/csv");
  }

  function exportJSONL() {
    download("capture.jsonl", rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
      "application/x-ndjson");
  }

  const total = rows.length;

  return (
    <div className="flex flex-col gap-5 max-w-[1100px]">
      {/* local-only banner */}
      <div className="flex items-center gap-[8px] rounded-[10px] border border-line-green bg-[#0b140f] px-4 py-[10px] font-mono text-[11px] text-good">
        <span className="w-[7px] h-[7px] rounded-full bg-good animate-pulse flex-none" />
        Local only — clips and metadata stay in your browser. Nothing is uploaded. Recorded
        clips download to disk; place them under <span className="text-ink">backend/data/raw/&lt;label&gt;/</span>.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
        {/* capture panel */}
        <div className="border border-line-strong bg-panel rounded-[13px] overflow-hidden">
          <div className="px-[14px] py-[9px] border-b border-line bg-deep font-mono text-[10.5px] text-faint flex items-center justify-between">
            <span>capture · webcam / upload</span>
            <span style={{ color: ACCENT[label] }}>{label}</span>
          </div>
          <div className="relative aspect-[16/10] bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
            />
            {!camOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="font-mono text-[11px] text-faint">
                  {camError ?? "Enable the webcam to record, or upload a clip."}
                </div>
                <div className="flex gap-2">
                  <button onClick={enableCam} className="font-mono text-[11px] px-3 py-2 rounded-[7px] bg-signal text-[#06121f] font-semibold">
                    ▸ enable webcam
                  </button>
                  <button onClick={() => fileRef.current?.click()} className="font-mono text-[11px] px-3 py-2 rounded-[7px] border border-line-strong text-muted hover:text-ink">
                    ↑ upload clip
                  </button>
                </div>
              </div>
            )}
            {recording && (
              <div className="absolute left-3 top-3 flex items-center gap-[6px] font-mono text-[10px] text-rec">
                <span className="w-[7px] h-[7px] rounded-full bg-rec animate-blink" /> REC
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-[14px] py-[11px] border-t border-line bg-deep">
            {camOn && !recording && (
              <button onClick={startRec} className="font-mono text-[11px] px-3 py-2 rounded-[7px] bg-rec/20 border border-rec text-rec">
                ● record
              </button>
            )}
            {recording && (
              <button onClick={stopRec} className="font-mono text-[11px] px-3 py-2 rounded-[7px] bg-rec text-white">
                ■ stop &amp; save
              </button>
            )}
            <button onClick={() => fileRef.current?.click()} className="font-mono text-[11px] px-3 py-2 rounded-[7px] border border-line-strong text-muted hover:text-ink">
              ↑ upload
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
            <span className="ml-auto font-mono text-[10px] text-faint2">next: {baseName}.webm</span>
          </div>
        </div>

        {/* metadata + class */}
        <div className="flex flex-col gap-3">
          <div className="border border-line-strong bg-panel rounded-[12px] px-4 py-[14px]">
            <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-faint mb-[10px]">class</div>
            <div className="flex flex-wrap gap-[6px]">
              {CLASSES.map((c) => (
                <button
                  key={c}
                  onClick={() => setLabel(c)}
                  className="font-mono text-[11px] px-[10px] py-[6px] rounded-[6px]"
                  style={
                    c === label
                      ? { background: ACCENT[c] + "22", color: ACCENT[c], border: `1px solid ${ACCENT[c]}66` }
                      : { background: "#0e131a", color: "#8893a3", border: "1px solid #1a222e" }
                  }
                >
                  {c} · {counts[c]}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-line-strong bg-panel rounded-[12px] px-4 py-[14px] grid grid-cols-2 gap-[10px]">
            {([
              ["subject_id", subject, setSubject, "s01"],
              ["camera_view", camera, setCamera, "front / oblique / side"],
              ["object", object, setObject, "cup / bottle / tool"],
              ["lighting", lighting, setLighting, "normal / low"],
            ] as const).map(([name, val, setter, ph]) => (
              <label key={name} className="flex flex-col gap-1">
                <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-faint2">{name}</span>
                <input
                  value={val}
                  placeholder={ph}
                  onChange={(e) => setter(e.target.value)}
                  className="bg-deep border border-line-strong rounded-[6px] px-2 py-[6px] text-[12px] text-ink outline-none focus:border-signal"
                />
              </label>
            ))}
            <label className="flex flex-col gap-1 col-span-2">
              <span className="font-mono text-[9.5px] tracking-[0.08em] uppercase text-faint2">notes</span>
              <input
                value={notes}
                placeholder="optional"
                onChange={(e) => setNotes(e.target.value)}
                className="bg-deep border border-line-strong rounded-[6px] px-2 py-[6px] text-[12px] text-ink outline-none focus:border-signal"
              />
            </label>
          </div>
        </div>
      </div>

      {/* per-class progress */}
      <div className="border border-line-strong bg-panel rounded-[12px] px-[18px] py-[15px]">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint">collection progress · target {TARGET}/class</span>
          <span className="font-mono text-[10.5px] text-faint">{total} clips total</span>
        </div>
        <div className="flex flex-col gap-[9px]">
          {CLASSES.map((c) => (
            <div key={c} className="flex items-center gap-3">
              <span className="w-[64px] text-[12px]" style={{ color: ACCENT[c] }}>{c}</span>
              <div className="flex-1 h-[14px] bg-deep rounded-[5px] overflow-hidden">
                <div className="h-full rounded-[5px]" style={{ width: `${Math.min(100, (counts[c] / TARGET) * 100)}%`, background: ACCENT[c] }} />
              </div>
              <span className="w-[52px] text-right font-mono text-[11px] text-muted">{counts[c]}/{TARGET}</span>
            </div>
          ))}
        </div>
      </div>

      {/* manifest row preview + collected table */}
      <div className="border border-line-strong bg-panel rounded-[12px] px-[18px] py-[15px]">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint">manifest row preview (next capture)</span>
          <div className="flex gap-2">
            <button onClick={exportCSV} disabled={!total} className="font-mono text-[10.5px] px-3 py-[6px] rounded-[6px] border border-line-accent text-signal disabled:opacity-40">↓ manifest.csv</button>
            <button onClick={exportJSONL} disabled={!total} className="font-mono text-[10.5px] px-3 py-[6px] rounded-[6px] border border-line-strong text-muted disabled:opacity-40">↓ capture.jsonl</button>
            {!!total && <button onClick={() => { if (confirm("Clear all collected rows?")) setRows([]); }} className="font-mono text-[10.5px] px-3 py-[6px] rounded-[6px] border border-[#3a1414] text-[#ff5a4d]">clear</button>}
          </div>
        </div>
        <pre className="bg-deep border border-line rounded-[8px] p-3 font-mono text-[10.5px] text-muted overflow-x-auto">
{JSON.stringify({
  video_id: baseName, path: `data/raw/${label}/${baseName}.webm`, label,
  subject_id: subject || "s00", camera_view: camera || "front", object,
  start_time: 0, end_time: "<duration>", fps: ASSUMED_FPS, num_frames: "<dur*fps>",
}, null, 2)}
        </pre>

        {!!total && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left font-mono text-[10.5px]">
              <thead className="text-faint2">
                <tr>{["video_id", "label", "subject", "cam", "object", "dur", "frames", "src"].map((h) => <th key={h} className="py-1 pr-3">{h}</th>)}</tr>
              </thead>
              <tbody className="text-muted">
                {rows.slice(0, 12).map((r) => (
                  <tr key={r.video_id + r.path} className="border-t border-line">
                    <td className="py-1 pr-3 text-ink">{r.video_id}</td>
                    <td className="py-1 pr-3" style={{ color: ACCENT[r.label] }}>{r.label}</td>
                    <td className="py-1 pr-3">{r.subject_id}</td>
                    <td className="py-1 pr-3">{r.camera_view}</td>
                    <td className="py-1 pr-3">{r.object}</td>
                    <td className="py-1 pr-3">{r.end_time}s</td>
                    <td className="py-1 pr-3">{r.num_frames}</td>
                    <td className="py-1 pr-3 text-faint">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 12 && <div className="font-mono text-[10px] text-faint2 mt-1">+{rows.length - 12} more…</div>}
          </div>
        )}
      </div>

      <div className="font-mono text-[10.5px] text-faint2 leading-[1.6]">
        Next: place downloaded clips under <span className="text-faint">backend/data/raw/&lt;label&gt;/</span> (the
        suggested filenames already encode subject + view), then run the CLI in
        <span className="text-faint"> docs/DATA_CAPTURE_WORKFLOW.md</span> to extract keypoints,
        split, and train the baselines.
      </div>
    </div>
  );
}
