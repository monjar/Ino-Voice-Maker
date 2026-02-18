import { useEffect, useState } from 'react';
import GraphEditor from './components/GraphEditor';
import { audioEngine } from './audio/AudioEngine';
import { clamp, formatHz } from './utils/dsp';

export default function App() {
  const [durationMs, setDurationMs] = useState(500);
  const [waveform, setWaveform] = useState('square');
  const [masterGain, setMasterGain] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);

  const [volPoints, setVolPoints] = useState([
    { x: 0, y: 0 }, { x: 0.1, y: 1 }, { x: 0.6, y: 0.5 }, { x: 1, y: 0 },
  ]);
  const [freqPoints, setFreqPoints] = useState([
    { x: 0, y: 600 }, { x: 0.2, y: 1200 }, { x: 0.7, y: 800 }, { x: 1, y: 400 },
  ]);

  useEffect(() => () => audioEngine.dispose(), []);

  async function play() {
    setIsPlaying(true);
    await audioEngine.play({
      durationMs, waveform, masterGain, detune: 0,
      volPoints, freqPoints,
      onEnd: () => setIsPlaying(false),
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Robot SFX Designer</h1>
      <div className="max-w-2xl flex flex-col gap-6">
        <GraphEditor title="Volume" points={volPoints} setPoints={setVolPoints}
          yMin={0} yMax={1} yFormat={(v) => `%`} />
        <GraphEditor title="Frequency" points={freqPoints} setPoints={setFreqPoints}
          yMin={150} yMax={5000} yFormat={formatHz} />
        <div className="flex gap-3">
          <button onClick={isPlaying ? () => { audioEngine.stop(); setIsPlaying(false); } : play}
            className="px-6 py-3 rounded-xl bg-white text-black font-semibold">
            {isPlaying ? 'Stop' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}