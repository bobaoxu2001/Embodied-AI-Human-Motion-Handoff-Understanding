import { Route, Routes } from "react-router-dom";
import { PlaybackProvider } from "./state/playback";
import { AppShell } from "./components/AppShell";
import { Overview } from "./routes/Overview";
import { VideoAnalysis } from "./routes/VideoAnalysis";
import { PoseViewer3D } from "./routes/PoseViewer3D";
import { ModelInspector } from "./routes/ModelInspector";
import { ModelCard } from "./routes/ModelCard";
import { DatasetEval } from "./routes/DatasetEval";
import { CaptureBuilder } from "./routes/CaptureBuilder";
import { Handoff } from "./routes/Handoff";

export default function App() {
  return (
    <PlaybackProvider>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route element={<AppShell />}>
          <Route path="/analyze" element={<VideoAnalysis />} />
          <Route path="/pose" element={<PoseViewer3D />} />
          <Route path="/inspector" element={<ModelInspector />} />
          <Route path="/model-card" element={<ModelCard />} />
          <Route path="/dataset" element={<DatasetEval />} />
          <Route path="/capture" element={<CaptureBuilder />} />
          <Route path="/handoff" element={<Handoff />} />
        </Route>
        <Route path="*" element={<Overview />} />
      </Routes>
    </PlaybackProvider>
  );
}
