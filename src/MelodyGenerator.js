import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Play, Square, RefreshCw, Music } from 'lucide-react';

// --- Constants & Helpers ---

const SCALE_STEPS = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11, 12],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11, 12],
  pentatonic_major: [0, 2, 4, 7, 9, 12],
  pentatonic_minor: [0, 3, 5, 7, 10, 12],
  blues: [0, 3, 5, 6, 7, 10, 12],
  dorian: [0, 2, 3, 5, 7, 9, 10, 12],
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12],
  lydian: [0, 2, 4, 6, 7, 9, 11, 12],
  mixolydian: [0, 2, 4, 5, 7, 9, 10, 12],
  locrian: [0, 1, 3, 5, 6, 8, 10, 12],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  whole_tone: [0, 2, 4, 6, 8, 10, 12],
  diminished_half: [0, 1, 3, 4, 6, 7, 9, 10, 12],
  diminished_whole: [0, 2, 3, 5, 6, 8, 9, 11, 12],
  double_harmonic_minor: [0, 1, 4, 5, 7, 8, 11, 12],
  spanish_gypsy: [0, 1, 4, 5, 7, 8, 10, 12],
  enigma: [0, 1, 4, 6, 8, 10, 11, 12],
  prometheus: [0, 2, 4, 6, 9, 10, 12]
};

const DURATIONS = [
  { notation: "1n", sn: 16, label: "Whole" },
  { notation: "2n", sn: 8, label: "Half" },
  { notation: "4n", sn: 4, label: "Quarter" },
  { notation: "8n", sn: 2, label: "Eighth" },
  { notation: "16n", sn: 1, label: "16th" }
];

const TOTAL_SN_NEEDED = 64;

function snToMBS(totalSixteenths) {
  const measure = Math.floor(totalSixteenths / 16);
  const sixteenthsInMeasure = totalSixteenths % 16;
  const beat = Math.floor(sixteenthsInMeasure / 4);
  const sixteenth = sixteenthsInMeasure % 4;
  return `${measure}:${beat}:${sixteenth}`;
}

function generateChromaticRange(lowNote, highNote) {
  try {
    const lowMidi = Tone.Midi(lowNote).toMidi();
    const highMidi = Tone.Midi(highNote).toMidi();

    if (lowMidi >= highMidi) {
      throw new Error("Low note must be strictly lower than high note.");
    }

    const range = [];
    for (let midi = highMidi; midi >= lowMidi; midi--) {
      const noteStr = Tone.Midi(midi).toNote();
      if (!noteStr.includes('##')) {
        range.push(noteStr);
      }
    }
    return range;
  } catch (e) {
    console.error("Invalid pitch input:", e);
    return [];
  }
}

function getPitchData(lowNote, highNote, scaleKey) {
  const chromaticGridRange = generateChromaticRange(lowNote, highNote);
  if (chromaticGridRange.length === 0) return { scalePitches: [], chromaticGridRange: [] };

  const steps = SCALE_STEPS[scaleKey];
  const scalePitches = [];

  chromaticGridRange.forEach(pitch => {
    try {
      const midi = Tone.Midi(pitch).toMidi();
      const chromaticStep = midi % 12;

      if (steps.includes(chromaticStep)) {
        scalePitches.push(pitch);
      }
    } catch (e) {
      console.warn(`Skipping invalid pitch during filtering: ${pitch}`);
    }
  });

  return { scalePitches, chromaticGridRange };
}

// --- Component ---

export default function MelodyGenerator() {
  // UI State
  const [bpm, setBpm] = useState(120);
  const [lowNote, setLowNote] = useState('C3');
  const [highNote, setHighNote] = useState('C5');
  const [scale, setScale] = useState('major');
  const [instrumentType, setInstrumentType] = useState('electric_piano');
  const [sequence, setSequence] = useState([]);
  const [statusMessage, setStatusMessage] = useState("Digital Piano Synth ready. Ready to generate!");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Tone.js Refs
  const instrumentRef = useRef(null);
  const metronomeRef = useRef(null);
  const metronomeVolumeRef = useRef(null);
  const sequencePartRef = useRef(null);
  const metronomeIdRef = useRef(null);

  // Helper to create instrument
  const createInstrument = (key) => {
    let instr;
    if (instrumentRef.current) {
      instrumentRef.current.dispose();
    }

    switch (key) {
      case 'bass_synth':
        instr = new Tone.MonoSynth({
          oscillator: { type: "sawtooth" },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 },
          filterEnvelope: {
            attack: 0.005, decay: 0.1, sustain: 0.5, release: 0.5,
            baseFrequency: 200, octaves: 3,
          }
        }).toDestination();
        break;
      case 'marimba':
        instr = new Tone.PolySynth(Tone.MembraneSynth, {
          pitchDecay: 0.05, octaves: 2,
          envelope: { attack: 0.001, decay: 0.4, sustain: 0.0, release: 0.0 }
        }).toDestination();
        break;
      case 'electric_piano':
      default:
        instr = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "fmsquare", modulationType: "square", harmonicity: 0.5, modulationIndex: 3 },
          envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 1.5 }
        }).toDestination();
        break;
    }
    return instr;
  };

  // Initialize Tone.js on mount
  useEffect(() => {
    // 1. Initialize Instrument
    instrumentRef.current = createInstrument(instrumentType);

    // 2. Initialize Metronome Volume
    metronomeVolumeRef.current = new Tone.Volume(6).toDestination();

    // 3. Initialize Metronome Synth
    metronomeRef.current = new Tone.MembraneSynth({
      pitchDecay: 0.005,
      octaves: 0.5,
      envelope: {
        attack: 0.001,
        decay: 0.08,
        sustain: 0.0,
        release: 0.05,
      }
    }).connect(metronomeVolumeRef.current);

    Tone.Transport.bpm.value = bpm;

    return () => {
      // Cleanup
      if (instrumentRef.current) instrumentRef.current.dispose();
      if (metronomeRef.current) metronomeRef.current.dispose();
      if (metronomeVolumeRef.current) metronomeVolumeRef.current.dispose();
      if (sequencePartRef.current) sequencePartRef.current.dispose();
      if (metronomeIdRef.current !== null) Tone.Transport.clear(metronomeIdRef.current);
      Tone.Transport.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Effect to update BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
    setStatusMessage(`Tempo set to ${bpm} BPM.`);
  }, [bpm]);

  const handleInstrumentChange = (e) => {
    const newType = e.target.value;
    setInstrumentType(newType);
    if (Tone.Transport.state === 'started') {
      stopSequence();
    }
    instrumentRef.current = createInstrument(newType);
    setStatusMessage(`${e.target.options[e.target.selectedIndex].text} selected. Ready to generate!`);
  };

  const clearSequence = () => {
    if (sequencePartRef.current) {
      sequencePartRef.current.stop();
      sequencePartRef.current.dispose();
      sequencePartRef.current = null;
    }
    if (metronomeIdRef.current !== null) {
      Tone.Transport.clear(metronomeIdRef.current);
      metronomeIdRef.current = null;
    }

    Tone.Transport.stop();
    setIsPlaying(false);

    // Remove highlights
    document.querySelectorAll('.note-highlight').forEach(el => {
      el.classList.remove('note-highlight');
    });

    setSequence([]);
    setStatusMessage('Sequence output will appear here.');
  };

  const stopSequence = () => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    document.querySelectorAll('.note-highlight').forEach(el => el.classList.remove('note-highlight'));
    setIsPlaying(false);
  };

  const setupTonePart = (newSequence) => {
    const toneData = newSequence.map(note => ({
      time: note.start_mbs,
      note: note.note,
      duration: note.duration,
      index: note.index
    }));

    sequencePartRef.current = new Tone.Part((time, value) => {
      if (instrumentRef.current) {
        instrumentRef.current.triggerAttackRelease(value.note, value.duration, time);
      }

      Tone.Draw.schedule(() => {
        const idx = value.index;
        const block = document.getElementById(`note-${idx}`);

        // Remove highlight from all notes
        document.querySelectorAll('#sequenceDisplay span').forEach(el => el.classList.remove('note-highlight'));

        // Apply highlight to current note text
        if (block) {
          block.classList.add('note-highlight');
        }
      }, time);

    }, toneData).start(0);

    sequencePartRef.current.loop = true;
    sequencePartRef.current.loopEnd = '4m';
  };

  const setupMetronomePart = () => {
    metronomeIdRef.current = Tone.Transport.scheduleRepeat((time) => {
      const beat = Tone.Transport.getBarsBeatsSixteenths().split(':')[1];
      if (metronomeRef.current) {
        if (beat === '0') {
          metronomeRef.current.triggerAttackRelease("C7", "16n", time, 1);
        } else {
          metronomeRef.current.triggerAttackRelease("G6", "32n", time, 0.9);
        }
      }
    }, "4n");
  };

  const generateSequence = () => {
    clearSequence();
    setIsGenerating(true);
    setStatusMessage("Generating...");

    // Allow UI to update before heavy calc (though logic here is fast enough usually)
    setTimeout(() => {
      const selectedScaleKey = scale;
      const lowNoteVal = lowNote.toUpperCase();
      const highNoteVal = highNote.toUpperCase();

      const { scalePitches } = getPitchData(lowNoteVal, highNoteVal, selectedScaleKey);

      if (scalePitches.length === 0) {
        setIsGenerating(false);
        setStatusMessage("Error: Invalid range or scale contains no notes in range.");
        return;
      }

      let remainingSN = TOTAL_SN_NEEDED;
      let noteIndex = 0;
      const newSequence = [];
      const MAX_ITERATIONS = TOTAL_SN_NEEDED + 10;

      while (remainingSN > 0 && noteIndex < MAX_ITERATIONS) {
        if (remainingSN === 1) {
          const randomPitchIndex = Math.floor(Math.random() * scalePitches.length);
          newSequence.push({
            note: scalePitches[randomPitchIndex],
            duration: '16n',
            sn_value: 1,
            start_mbs: snToMBS(TOTAL_SN_NEEDED - 1),
            label: '16th',
            index: noteIndex++
          });
          remainingSN = 0;
          break;
        }

        const possibleDurations = DURATIONS.filter(d => d.sn <= remainingSN);
        if (possibleDurations.length === 0) {
          remainingSN = 0;
          break;
        }

        let randomDuration = possibleDurations.find(d => d.sn === remainingSN);
        if (!randomDuration) {
          randomDuration = possibleDurations[Math.floor(Math.random() * possibleDurations.length)];
        }

        const randomPitchIndex = Math.floor(Math.random() * scalePitches.length);
        const pitch = scalePitches[randomPitchIndex];
        const start_sn = TOTAL_SN_NEEDED - remainingSN;

        newSequence.push({
          note: pitch,
          duration: randomDuration.notation,
          label: randomDuration.label,
          sn_value: randomDuration.sn,
          start_mbs: snToMBS(start_sn),
          index: noteIndex++
        });

        remainingSN -= randomDuration.sn;
      }

      setSequence(newSequence);
      setupTonePart(newSequence);
      setupMetronomePart();

      setIsGenerating(false);
      setStatusMessage(`Generated sequence using the ${selectedScaleKey} scale in the range ${lowNoteVal} to ${highNoteVal}.`);
    }, 0);
  };

  const handlePlay = async () => {
    await Tone.start();

    if (sequence.length === 0) {
      setStatusMessage("Error: Sequence not generated yet. Click 'Generate Melody' first.");
      return;
    }

    if (Tone.Transport.state === 'started') {
      stopSequence();
      return;
    }

    if (sequencePartRef.current && Tone.Transport.seconds >= Tone.Time(sequencePartRef.current.loopEnd).toSeconds()) {
      Tone.Transport.position = 0;
    }

    Tone.Transport.start();
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e] font-sans p-4">
      <div className="w-full max-w-lg p-6 rounded-xl text-white border border-[#3e3e6f] bg-[#2a2a47] shadow-2xl">
        <h1 className="text-3xl font-extrabold text-[#87cefa] mb-2 flex items-center gap-2">
          <Music className="w-8 h-8" />
          Random Melody Generator
        </h1>
        <p className="text-gray-400 mb-4">Generates a random, looping 4-measure melody using a selected scale and custom pitch range.</p>

        {/* Controls */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Low Note (e.g., C3)</label>
              <input
                type="text"
                value={lowNote}
                onChange={(e) => setLowNote(e.target.value)}
                className="w-full p-2 bg-[#3e3e6f] border border-[#5a5a8f] text-white rounded-lg focus:ring-[#87cefa] focus:border-[#87cefa] uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">High Note (e.g., C5)</label>
              <input
                type="text"
                value={highNote}
                onChange={(e) => setHighNote(e.target.value)}
                className="w-full p-2 bg-[#3e3e6f] border border-[#5a5a8f] text-white rounded-lg focus:ring-[#87cefa] focus:border-[#87cefa] uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tempo (BPM)</label>
              <input
                type="number"
                value={bpm}
                min="40"
                max="240"
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className="w-full p-2 bg-[#3e3e6f] border border-[#5a5a8f] text-white rounded-lg focus:ring-[#87cefa] focus:focus:border-[#87cefa]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Select Instrument</label>
              <select
                value={instrumentType}
                onChange={handleInstrumentChange}
                className="w-full p-2 bg-[#3e3e6f] border border-[#5a5a8f] text-white rounded-lg focus:ring-[#87cefa] focus:border-[#87cefa]"
              >
                <option value="electric_piano">Electric Piano</option>
                <option value="bass_synth">Electric Bass</option>
                <option value="marimba">Marimba/Mallet</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Select Scale (Key of C)</label>
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              className="w-full p-2 bg-[#3e3e6f] border border-[#5a5a8f] text-white rounded-lg focus:ring-[#87cefa] focus:border-[#87cefa]"
            >
              <option value="major">1. Major (Ionian)</option>
              <option value="minor">2. Natural Minor (Aeolian)</option>
              <option value="harmonic_minor">3. Harmonic Minor</option>
              <option value="melodic_minor">4. Melodic Minor</option>
              <option value="pentatonic_major">5. Pentatonic Major</option>
              <option value="pentatonic_minor">6. Pentatonic Minor</option>
              <option value="blues">7. Blues Scale</option>
              <option value="dorian">8. Dorian Mode</option>
              <option value="phrygian">9. Phrygian Mode</option>
              <option value="lydian">10. Lydian Mode</option>
              <option value="mixolydian">11. Mixolydian Mode</option>
              <option value="locrian">12. Locrian Mode</option>
              <option value="chromatic">13. Chromatic Scale</option>
              <option value="whole_tone">14. Whole Tone Scale</option>
              <option value="diminished_half">15. Diminished (Half-Whole)</option>
              <option value="diminished_whole">16. Diminished (Whole-Half)</option>
              <option value="double_harmonic_minor">17. Hungarian Minor (Double Harmonic)</option>
              <option value="spanish_gypsy">18. Spanish Gypsy (Phrygian Dominant)</option>
              <option value="enigma">19. Enigma Scale</option>
              <option value="prometheus">20. Prometheus Scale</option>
            </select>
          </div>

          <div className="flex space-x-4 pt-2">
            <button
              onClick={generateSequence}
              disabled={isGenerating}
              className="flex-1 bg-[#5a5a8f] hover:bg-[#6e6ea3] text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition duration-150 ease-in-out flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? "Generating..." : "Generate Melody"}
            </button>
            <button
              onClick={handlePlay}
              disabled={sequence.length === 0}
              className={`w-40 font-extrabold py-3 px-4 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                sequence.length === 0
                  ? 'opacity-50 cursor-not-allowed bg-[#5a5a8f] text-[#1a1a2e]'
                  : 'bg-[#87cefa] hover:bg-[#a9d7ff] hover:-translate-y-0.5 text-[#1a1a2e] cursor-pointer'
              }`}
            >
              {isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              {isPlaying ? "Stop" : "Play"}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="mt-6 border-t border-gray-700 pt-4">
          <h2 className="text-xl font-semibold text-gray-200 mb-3">Generated Sequence (4 Measures)</h2>
          <div
            id="sequenceDisplay"
            className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-gray-300 font-mono text-sm max-h-[400px] overflow-y-auto whitespace-pre-wrap min-h-[100px]"
          >
            {sequence.length === 0 ? "Sequence output will appear here." : (
              <div>
                {(() => {
                  let output = [];
                  let currentMeasure = 0;
                  let currentSN = 0;
                  let measureNotes = [];

                  sequence.forEach((note, i) => {
                    const measureIndex = Math.floor(currentSN / 16);
                    if (measureIndex > currentMeasure) {
                        output.push(<div key={`m-${currentMeasure}`} className="mb-1">{measureNotes}</div>);
                        measureNotes = [];
                        currentMeasure = measureIndex;
                    }
                    measureNotes.push(
                        <span key={`n-${i}`} id={`note-${i}`} className="mr-2 transition-colors duration-100">
                            {note.note} ({note.label})
                        </span>
                    );
                    currentSN += note.sn_value;
                  });
                  // Push last measure
                  if (measureNotes.length > 0) {
                      output.push(<div key={`m-${currentMeasure}`}>{measureNotes}</div>);
                  }
                  return output;
                })()}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-sm mt-4 text-gray-500">
          {statusMessage}
        </p>

      </div>
    </div>
  );
}
