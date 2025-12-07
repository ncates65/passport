import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import './MidiSequencer.css';

// --- Constants ---
const SCALE_STEPS = {
  // Standard
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11, 12],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11, 12],

  // Pentatonic & Blues
  pentatonic_major: [0, 2, 4, 7, 9, 12],
  pentatonic_minor: [0, 3, 5, 7, 10, 12],
  blues: [0, 3, 5, 6, 7, 10, 12],

  // Modes
  dorian: [0, 2, 3, 5, 7, 9, 10, 12],
  phrygian: [0, 1, 3, 5, 7, 8, 10, 12],
  lydian: [0, 2, 4, 6, 7, 9, 11, 12],
  mixolydian: [0, 2, 4, 5, 7, 9, 10, 12],
  locrian: [0, 1, 3, 5, 6, 8, 10, 12],

  // Symmetrical & Exotic
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  whole_tone: [0, 2, 4, 6, 8, 10, 12],
  diminished_half: [0, 1, 3, 4, 6, 7, 9, 10, 12], // Half-Whole
  diminished_whole: [0, 2, 3, 5, 6, 8, 9, 11, 12], // Whole-Half
  double_harmonic_minor: [0, 1, 4, 5, 7, 8, 11, 12], // Hungarian Minor
  spanish_gypsy: [0, 1, 4, 5, 7, 8, 10, 12], // Phrygian Dominant
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
const TOTAL_QN_NEEDED = 16;

export default function MidiSequencer() {
  // --- State ---
  const [instrumentType, setInstrumentType] = useState('electric_piano');
  const [bpm, setBpm] = useState(120);
  const [scaleKey, setScaleKey] = useState('major');
  const [lowNote, setLowNote] = useState('C3');
  const [highNote, setHighNote] = useState('C5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Setting up synthesizers...');

  // Data for rendering
  const [chromaticGridRange, setChromaticGridRange] = useState([]); // List of pitch strings (rows)
  const [scalePitches, setScalePitches] = useState([]); // List of pitches in current scale
  const [generatedSequence, setGeneratedSequence] = useState([]); // Array of note objects
  const [currentQuarterNote, setCurrentQuarterNote] = useState(-1);
  const [highlightedNotes, setHighlightedNotes] = useState(new Set()); // Set of note indices

  // --- Refs ---
  const instrumentRef = useRef(null);
  const sequencePartRef = useRef(null);
  const toneInitialized = useRef(false);
  // Using refs for grid rendering constants to avoid re-renders or passing props deeply
  const sequencerContainerRef = useRef(null);

  // --- Helpers ---
  const createInstrument = (key) => {
    if (instrumentRef.current) {
      instrumentRef.current.dispose();
    }

    let instrument;
    switch (key) {
      case 'bass_synth':
        instrument = new Tone.MonoSynth({
          oscillator: { type: "sawtooth" },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5, },
          filterEnvelope: {
            attack: 0.005, decay: 0.1, sustain: 0.5, release: 0.5,
            baseFrequency: 200, octaves: 3,
          }
        }).toDestination();
        break;
      case 'marimba':
        instrument = new Tone.PolySynth(Tone.MembraneSynth, {
          pitchDecay: 0.05, octaves: 2,
          envelope: { attack: 0.001, decay: 0.4, sustain: 0.0, release: 0.0 }
        }).toDestination();
        break;
      case 'electric_piano':
      default:
        instrument = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "fmsquare", modulationType: "square", harmonicity: 0.5, modulationIndex: 3 },
          envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 1.5 }
        }).toDestination();
        break;
    }
    instrumentRef.current = instrument;
  };

  const snToMBS = (totalSixteenths) => {
    const measure = Math.floor(totalSixteenths / 16);
    const sixteenthsInMeasure = totalSixteenths % 16;
    const beat = Math.floor(sixteenthsInMeasure / 4);
    const sixteenth = sixteenthsInMeasure % 4;
    return `${measure}:${beat}:${sixteenth}`;
  };

  const generateChromaticRange = (lNote, hNote) => {
    const MAX_PITCHES_TO_RENDER = 48;
    try {
      const lowMidi = Tone.Midi(lNote).toMidi();
      let highMidi = Tone.Midi(hNote).toMidi();

      if (lowMidi >= highMidi) {
        throw new Error("Low note must be strictly lower than high note.");
      }

      if (highMidi - lowMidi + 1 > MAX_PITCHES_TO_RENDER) {
        highMidi = lowMidi + MAX_PITCHES_TO_RENDER - 1;
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
  };

  const getPitchData = (lNote, hNote, sKey) => {
    const gridRange = generateChromaticRange(lNote, hNote);
    if (gridRange.length === 0) return { validScalePitches: [], gridRange: [] };

    const steps = SCALE_STEPS[sKey];
    const validScalePitches = [];

    gridRange.forEach(pitch => {
      try {
        const midi = Tone.Midi(pitch).toMidi();
        const chromaticStep = midi % 12;
        if (steps.includes(chromaticStep)) {
          validScalePitches.push(pitch);
        }
      } catch(e) { }
    });

    return { validScalePitches, gridRange };
  };

  // --- Effects ---

  // Initialization
  useEffect(() => {
    if (!toneInitialized.current) {
      createInstrument(instrumentType);
      setStatusMessage('Digital Piano Synth ready. Ready to generate!');
      toneInitialized.current = true;
    }
    return () => {
        if (sequencePartRef.current) sequencePartRef.current.dispose();
        if (instrumentRef.current) instrumentRef.current.dispose();
        Tone.Transport.stop();
        Tone.Transport.cancel();
    };
  }, []); // Run once

  // Instrument Change
  useEffect(() => {
    if (toneInitialized.current) {
        createInstrument(instrumentType);
        setStatusMessage('Instrument changed. Ready to play!');
    }
  }, [instrumentType]);

  // BPM Change
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);


  // --- Logic ---
  const stopSequence = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setIsPlaying(false);
    setCurrentQuarterNote(-1);
    setHighlightedNotes(new Set());
  }, []);

  const playSequence = async () => {
    await Tone.start();

    if (generatedSequence.length === 0) {
      setStatusMessage("Error: Sequence not generated yet. Click 'Generate Sequence' first.");
      return;
    }

    if (Tone.Transport.state === 'started') {
      stopSequence();
      return;
    }

    // Reset position if at end
    if (Tone.Transport.seconds >= Tone.Time(sequencePartRef.current?.loopEnd || '4m').toSeconds()) {
        Tone.Transport.position = 0;
    }

    Tone.Transport.start();
    setIsPlaying(true);
  };

  const generateSequence = useCallback(async () => {
    setIsGenerating(true);
    setStatusMessage("Generating...");
    stopSequence();

    // Use setTimeout to allow UI to update (spinner/loading state)
    setTimeout(() => {
        const { validScalePitches, gridRange } = getPitchData(lowNote.toUpperCase(), highNote.toUpperCase(), scaleKey);

        if (validScalePitches.length === 0) {
            setStatusMessage("Error: Invalid range or scale contains no notes in range.");
            setIsGenerating(false);
            return;
        }

        setChromaticGridRange(gridRange);
        setScalePitches(validScalePitches);

        // Sequence Generation Logic
        let remainingSN = TOTAL_SN_NEEDED;
        let noteIndex = 0;
        const newSequence = [];
        const MAX_ITERATIONS = TOTAL_SN_NEEDED + 10;

        while (remainingSN > 0 && noteIndex < MAX_ITERATIONS) {
            if (remainingSN === 1) {
                const randomPitchIndex = Math.floor(Math.random() * validScalePitches.length);
                newSequence.push({
                    note: validScalePitches[randomPitchIndex],
                    duration: '16n',
                    sn_value: 1,
                    start_qn: (TOTAL_SN_NEEDED - 1) / 4,
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

            const randomPitchIndex = Math.floor(Math.random() * validScalePitches.length);
            const pitch = validScalePitches[randomPitchIndex];

            const note = {
                note: pitch,
                duration: randomDuration.notation,
                sn_value: randomDuration.sn,
                start_qn: (TOTAL_SN_NEEDED - remainingSN) / 4,
                index: noteIndex++
            };

            newSequence.push(note);
            remainingSN -= randomDuration.sn;
        }

        setGeneratedSequence(newSequence);

        // Setup Tone.Part
        if (sequencePartRef.current) {
            sequencePartRef.current.dispose();
            sequencePartRef.current = null;
        }

        // Remove old schedule events
        Tone.Transport.cancel();

        const toneData = [];
        let currentTimeSN = 0;

        newSequence.forEach(note => {
            toneData.push({
                time: snToMBS(currentTimeSN),
                note: note.note,
                duration: note.duration,
                index: note.index
            });
            currentTimeSN += note.sn_value;
        });

        sequencePartRef.current = new Tone.Part((time, value) => {
            if (instrumentRef.current) {
                instrumentRef.current.triggerAttackRelease(value.note, value.duration, time);
            }

            Tone.Draw.schedule(() => {
                setHighlightedNotes(prev => {
                    const next = new Set(prev);
                    next.add(value.index);
                    return next;
                });

                const noteDurationMs = Tone.Time(value.duration).toSeconds() * 1000;
                setTimeout(() => {
                     setHighlightedNotes(prev => {
                        const next = new Set(prev);
                        next.delete(value.index);
                        return next;
                    });
                }, noteDurationMs - 10);

            }, time);
        }, toneData).start(0);

        sequencePartRef.current.loop = true;
        sequencePartRef.current.loopEnd = '4m';

        // Schedule playhead highlighting
        Tone.Transport.scheduleRepeat(time => {
            Tone.Draw.schedule(() => {
                const currentQN = Math.floor((Tone.Transport.seconds / Tone.Time('4n').toSeconds()) % TOTAL_QN_NEEDED);
                setCurrentQuarterNote(currentQN);
            }, time);
        }, "4n");

        setIsGenerating(false);
        setStatusMessage(`Generated sequence using the ${scaleKey} scale in range ${lowNote} to ${highNote}.`);

    }, 50);

  }, [lowNote, highNote, scaleKey]);


  // --- Render Helpers ---
  const getNoteStyle = (note, gridRange) => {
    // We need to calculate position.
    // Row height = 24px (plus gap 1px, effectively 25px steps if strictly mapping, but user css used gap:1px)
    // Actually the user CSS used grid-gap: 1px.
    // The "note-block" is absolute.
    // Top = (rowIndex + 1) * 24 + ??
    // Wait, in grid with gap 1px:
    // Row 0 starts at 0.
    // Row 1 starts at 24 + 1 = 25.
    // Row 2 starts at 50.
    // Row index i => top = i * (24 + 1) + header_height ??
    // The original code used:
    // top = `${rowHeight * (pitchIndex + 1) + 2}px`;
    // where pitchIndex is 0-based index of pitch in `pitchesToDraw`.
    // It seems it accounted for the "Measure Label" row as index 0 in the grid, but notes are overlayed.
    //
    // Let's refine the calculation.
    // In the grid:
    // Header row (Measure Label) is first child.
    // Then pitch rows.
    // We want the note to align with the pitch row.
    // The pitch label height is 24px.
    // Grid gap is 1px.
    // So row height effectively 25px.
    // The first row (Measure Label) is also 24px + 1px gap.
    // So pitchIndex 0 starts at 25px (approx).

    // We can rely on fixed calculation if we match the CSS exactly.
    // `rowHeight` = 24.
    // `pitchIndex` = index in `chromaticGridRange`.
    // The original code: top = 24 * (pitchIndex + 1) + 2.
    // +1 is for the header row.
    // +2 is likely a visual tweak.

    const pitchIndex = gridRange.indexOf(note.note);
    if (pitchIndex === -1) return { display: 'none' };

    const rowHeight = 24; // from CSS
    // Gap is 1px.
    // Top offset = Header(24) + Gap(1) + (RowHeight(24) + Gap(1)) * pitchIndex
    // = 25 + 25 * pitchIndex.
    // Original code used `rowHeight * (pitchIndex + 1)`. 24 * (i+1).
    // This ignores gap. But with 1px gap, it drifts.
    // However, the original code had `gap: 1px`.
    // Let's try to match the original calculation first: `24 * (pitchIndex + 1) + 2`.
    // We can tweak if it looks off.

    // Width calculation:
    // `qnWidth * (note.sn_value / 4) - 2`
    // We need the width of the grid container to know `qnWidth`.
    // This requires a ref to the container and measuring it, or using % widths.
    // 16 columns total.
    // `sn_value` / 4 gives quarter notes.
    // Width % = (sn_value / 4) / 16 * 100 = (sn_value / 64) * 100.
    // Left % = (start_qn / 16) * 100.

    // BUT, we have a "Pitch Label" column on the left.
    // `grid-template-columns: auto repeat(16, 1fr);`
    // The auto column is for the label.
    // The note blocks are overlayed.
    // If we use absolute positioning inside `sequencerContainer`, we need to account for the label width.
    // The original code hardcoded `pitchLabelWidth = 50`.
    // And `gridTotalTimeWidth = offsetWidth - 50`.
    // Using % is safer if we can assume the label width is fixed or excluded.

    // Better approach for React:
    // Place the notes inside the grid? No, notes span multiple cells.
    // Place notes in a container that overlays the 16-column track exactly.
    // Let's make the container `relative`.
    // We can separate the Label column from the Note columns visually or structurally?
    // The original uses one big grid.

    // Let's try to use % based positioning relative to the *grid area that contains the notes*.
    // We can have a `div` that sits on top of the grid columns 2-17.
    // But getting that alignment perfect with a separate overlay is hard if the columns are flexible (1fr).

    // Alternative:
    // `left: calc(50px + (100% - 50px) * (start_qn / 16))` ?
    // Assuming label is approx 50px? The original code had specific `pitchLabelWidth = 50` variable but logic read `pitch-label` text alignment.
    // Let's look at `pitch-label` css: `padding: 4px 4px; text-align: right;`. Width is determined by content ("auto").
    // We should probably force a width on the pitch label column to make math easy.
    // Let's add `width: 50px` to `.pitch-label` in styles (or inline).

    const LABEL_WIDTH = 50;
    const ROW_HEIGHT = 25; // 24px height + 1px gap approximation
    const HEADER_HEIGHT = 25; // Measure label row

    const top = HEADER_HEIGHT + (pitchIndex * ROW_HEIGHT) + 2; // +2 for visual alignment like original
    const leftPercent = (note.start_qn / 16) * 100;
    const widthPercent = (note.sn_value / 64) * 100;

    return {
        top: `${top}px`,
        left: `calc(${LABEL_WIDTH}px + (100% - ${LABEL_WIDTH}px) * ${note.start_qn / 16} + 1px)`,
        width: `calc(((100% - ${LABEL_WIDTH}px) * ${note.sn_value / 64}) - 2px)`,
        height: '24px'
    };
  };


  return (
    <div className="bg-[#1a1a2e] min-h-screen p-4 flex items-center justify-center font-sans text-white">
      <div id="app" className="card w-full max-w-4xl p-6 rounded-xl text-white border border-[#3e3e6f]">
        <h1 className="text-3xl font-extrabold text-[#87cefa] mb-2">MIDI Scale Sequencer</h1>
        <p className="text-gray-400 mb-6">Generates a random melody exactly **four measures** long (16 quarter notes total) within a custom pitch range.</p>

        {/* Controls */}
        <div className="space-y-4 mb-6">

            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="w-full md:w-1/4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Low Note</label>
                    <input
                        type="text"
                        value={lowNote}
                        onChange={(e) => setLowNote(e.target.value)}
                        className="w-full p-2 bg-[#3e3e6f] border border-[#5a5a8f] text-white rounded-lg focus:ring-[#87cefa] focus:border-[#87cefa] uppercase"
                    />
                </div>
                <div className="w-full md:w-1/4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">High Note</label>
                    <input
                        type="text"
                        value={highNote}
                        onChange={(e) => setHighNote(e.target.value)}
                        className="w-full p-2 bg-[#3e3e6f] border border-[#5a5a8f] text-white rounded-lg focus:ring-[#87cefa] focus:border-[#87cefa] uppercase"
                    />
                </div>
                 <div className="w-full md:w-1/4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Tempo (BPM)</label>
                    <input
                        type="number"
                        value={bpm}
                        min="40" max="240"
                        onChange={(e) => setBpm(e.target.value)}
                        className="w-full p-2 bg-[#3e3e6f] border border-[#5a5a8f] text-white rounded-lg focus:ring-[#87cefa] focus:border-[#87cefa]"
                    />
                </div>
                 <div className="w-full md:w-1/4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Select Instrument</label>
                    <select
                        value={instrumentType}
                        onChange={(e) => setInstrumentType(e.target.value)}
                        className="w-full p-2 bg-[#3e3e6f] border border-[#5a5a8f] text-white rounded-lg focus:ring-[#87cefa] focus:border-[#87cefa]"
                    >
                        <option value="electric_piano">Electric Piano</option>
                        <option value="bass_synth">Electric Bass</option>
                        <option value="marimba">Marimba/Mallet</option>
                    </select>
                </div>
            </div>

            {/* Row 2: Scale Selection */}
             <div className="flex items-center space-x-4">
                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Select Scale (Key of C)</label>
                    <select
                        value={scaleKey}
                        onChange={(e) => setScaleKey(e.target.value)}
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
            </div>

            {/* Buttons */}
            <div className="flex space-x-4 pt-2">
                <button
                    onClick={generateSequence}
                    disabled={isGenerating}
                    className="flex-1 generate-button bg-[#5a5a8f] hover:bg-[#6e6ea3] text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition duration-150 ease-in-out disabled:opacity-50"
                >
                    {isGenerating ? "Generating..." : "Generate Sequence (4 Measures)"}
                </button>
                <button
                    onClick={playSequence}
                    disabled={generatedSequence.length === 0}
                    className={`w-40 play-button text-[#1a1a2e] font-extrabold py-3 px-4 rounded-xl shadow-lg transition duration-150 ease-in-out ${
                        generatedSequence.length === 0 ? 'bg-[#5a5a8f] disabled-button' : 'bg-[#87cefa] hover:bg-[#a9d7ff]'
                    }`}
                >
                   {isPlaying ? (
                       <span className="flex items-center justify-center">Stop</span>
                   ) : (
                       <span className="flex items-center justify-center">Play</span>
                   )}
                </button>
            </div>
        </div>

        {/* MIDI Sequencer Display */}
        <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-200 mb-3">Sequencer Track (16 Quarter Notes Total)</h2>
            <div id="sequencerContainer" ref={sequencerContainerRef} className="relative overflow-x-auto">
                <div className="sequencer-grid w-full min-w-[600px]">
                    {/* Header Row */}
                    <div className="pitch-label sticky left-0 z-10 text-center font-bold bg-[#1a1a2e]" style={{width: '50px'}}>Meas</div>
                    <div className="pitch-label text-center text-white" style={{gridColumn: "span 4"}}>1</div>
                    <div className="pitch-label text-center text-white" style={{gridColumn: "span 4"}}>2</div>
                    <div className="pitch-label text-center text-white" style={{gridColumn: "span 4"}}>3</div>
                    <div className="pitch-label text-center text-white" style={{gridColumn: "span 4"}}>4</div>

                    {/* Chromatic Rows */}
                    {chromaticGridRange.map((pitch, rowIndex) => {
                         const isBlackKey = pitch.includes('b') || pitch.includes('#');
                         const isInScale = scalePitches.includes(pitch);
                         const baseClass = isInScale ? 'in-scale-bg' : 'not-in-scale-bg';
                         const blackKeyClass = isBlackKey ? ' black-key' : '';

                        return (
                            <React.Fragment key={pitch}>
                                <div className={`pitch-label sticky left-0 z-10 ${baseClass}${blackKeyClass}`} style={{width: '50px'}}>
                                    {pitch}
                                </div>
                                {Array.from({length: 16}).map((_, qnIndex) => {
                                    // Highlighting logic
                                    const isHighlightBar = currentQuarterNote === qnIndex;
                                    const bgStyle = (!isBlackKey && qnIndex % 2 !== 0 && isInScale) ? '#36365c' : undefined;

                                    return (
                                        <div
                                            key={qnIndex}
                                            className={`grid-cell ${baseClass}${blackKeyClass} ${isHighlightBar ? 'highlight-bar' : ''}`}
                                            style={{ backgroundColor: isHighlightBar ? undefined : bgStyle }}
                                        ></div>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Note Overlays */}
                {generatedSequence.map((note) => {
                    const style = getNoteStyle(note, chromaticGridRange);
                    const isHighlighted = highlightedNotes.has(note.index);
                    return (
                         <div
                            key={note.index}
                            className={`note-block absolute ${isHighlighted ? 'highlight-note' : ''}`}
                            style={style}
                         >
                            <span className="text-xs absolute left-1 top-0 text-[#1a1a2e] opacity-70 truncate w-full">
                                {note.note} ({note.duration})
                            </span>
                         </div>
                    );
                })}

            </div>
        </div>
        <p className="text-center text-sm mt-4 text-gray-500">
            {statusMessage}
        </p>
    </div>
    </div>
  );
}
