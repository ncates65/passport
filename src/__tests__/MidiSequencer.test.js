import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MidiSequencer from '../MidiSequencer';

// Mock Tone.js
jest.mock('tone', () => {
  const synthMock = {
    toDestination: jest.fn().mockReturnThis(),
    dispose: jest.fn(),
    triggerAttackRelease: jest.fn(),
  };

  class MockPolySynth {
    constructor() { return synthMock; }
  }

  class MockMonoSynth {
    constructor() { return synthMock; }
  }

  const MidiMock = (input) => {
      const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

      if (typeof input === 'number') {
          const noteIndex = input % 12;
          const noteName = notes[noteIndex];
          const octaveVal = Math.floor(input / 12) - 1;
          return {
              toNote: () => `${noteName}${octaveVal}`,
              toMidi: () => input
          };
      } else {
          return {
              toMidi: () => {
                  if (!input) return 0;
                  const match = input.match(/^([A-G][#b]?)(\-?\d+)$/);
                  if (!match) return 0;

                  let key = match[1];
                  const oct = parseInt(match[2]);

                  let index = notes.indexOf(key);
                  if (index === -1) return 0;
                  return (oct + 1) * 12 + index;
              },
              toNote: () => input
          };
      }
  };

  const PartMock = (cb, events) => {
      return {
          start: jest.fn().mockReturnThis(),
          stop: jest.fn(),
          dispose: jest.fn(),
          loop: false,
          loopEnd: 0
      };
  };

  return {
    PolySynth: MockPolySynth,
    MonoSynth: MockMonoSynth,
    MembraneSynth: jest.fn(),
    Synth: jest.fn(),
    Transport: {
      bpm: { value: 120 },
      stop: jest.fn(),
      start: jest.fn(),
      cancel: jest.fn(),
      scheduleRepeat: jest.fn(),
      seconds: 0,
      state: 'stopped'
    },
    Midi: MidiMock,
    Time: jest.fn().mockImplementation((t) => ({
        toSeconds: () => 1
    })),
    // Fix: Part should be a class constructor that returns the part instance
    Part: class {
        constructor(cb, events) {
            this.loop = false;
            this.loopEnd = 0;
            this.start = jest.fn().mockReturnThis();
            this.stop = jest.fn();
            this.dispose = jest.fn();
        }
    },
    Draw: {
        schedule: jest.fn(cb => cb())
    }
  };
});

test('renders sequencer title', () => {
  render(<MidiSequencer />);
  const linkElement = screen.getByText(/MIDI Scale Sequencer/i);
  expect(linkElement).toBeInTheDocument();
});

test('generates sequence on button click', async () => {
  render(<MidiSequencer />);
  const generateBtn = screen.getByText(/Generate Sequence/i);
  fireEvent.click(generateBtn);

  await waitFor(() => {
     expect(screen.getByText(/Generated sequence using the major scale/i)).toBeInTheDocument();
  }, { timeout: 3000 });
});
