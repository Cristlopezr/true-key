import { useRef, useState, useCallback } from 'react';
import { createPitchDetector, type PitchDetector, type DetectedNote, type PitchResult } from '@/utils/pitchDetection';
import { analyzeKeyWithDuration, type KeyAnalysisResult } from '@/utils/keyDetection';

interface AudioCaptureState {
  isCapturing: boolean;
  error: string | null;
  currentNote: PitchResult | null;
  detectedNotes: DetectedNote[];
  keyResult: KeyAnalysisResult | null;
}

interface AudioCaptureReturn extends AudioCaptureState {
  startCapture: () => Promise<void>;
  stopCapture: () => void;
}

/**
 * Custom hook for capturing live audio data from the user's microphone.
 * Uses Web Audio API to process audio and detects pitch using YIN algorithm.
 * Collects notes with duration during capture and analyzes key when stopped.
 */
export function useAudioCapture(): AudioCaptureReturn {
  const [state, setState] = useState<AudioCaptureState>({
    isCapturing: false,
    error: null,
    currentNote: null,
    detectedNotes: [],
    keyResult: null,
  });

  // Refs to persist audio nodes across renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const lowpassFilterRef = useRef<BiquadFilterNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pitchDetectorRef = useRef<PitchDetector | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to collect detected notes WITH DURATION during capture
  const collectedNotesRef = useRef<DetectedNote[]>([]);

  // Duration in ms before clearing the note from UI on silence
  const SILENCE_CLEAR_DELAY_MS = 750;

  /**
   * Callback when a note completes (with duration info).
   * This is triggered by the pitch detector when a note ends.
   */
  const handleNoteComplete = useCallback((note: DetectedNote) => {
    collectedNotesRef.current.push(note);
    // Update detectedNotes state for UI (keep currentNote visible)
    setState((prev) => ({
      ...prev,
      detectedNotes: [...prev.detectedNotes, note],
    }));

    // Start timeout to clear currentNote after prolonged silence
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    silenceTimeoutRef.current = setTimeout(() => {
      setState((prev) => (prev.currentNote ? { ...prev, currentNote: null } : prev));
    }, SILENCE_CLEAR_DELAY_MS);
  }, []);

  /**
   * Continuously reads time-domain audio data from the AnalyserNode
   * and performs pitch detection.
   */
  const readAudioData = useCallback(() => {
    if (!analyserNodeRef.current || !pitchDetectorRef.current) return;

    const analyser = analyserNodeRef.current;
    const pitchDetector = pitchDetectorRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const tick = () => {
      if (!analyserNodeRef.current) return;

      // Read time-domain data into the Float32Array
      analyser.getFloatTimeDomainData(dataArray);

      // Process audio buffer for pitch detection
      // Note: The pitch detector will call handleNoteComplete when notes end
      const result = pitchDetector.process(dataArray);

      // Update currentNote state for real-time UI feedback
      if (result) {
        // Clear any pending silence timeout since we have a valid note
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        setState((prev) => ({ ...prev, currentNote: result }));
      }

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  /**
   * Analyzes collected notes (with duration) and logs the detected key, mode, and scale.
   * Shows both primary and alternative (relative) keys when scores are close.
   * Called only when recording stops.
   */
  const analyzeCollectedNotes = useCallback(() => {
    const notes = collectedNotesRef.current;

    if (notes.length === 0) {
      return;
    }

    // Run key analysis with duration weighting
    const result = analyzeKeyWithDuration(notes);

    if (!result) {
      console.log('[TrueKey] Could not determine key (insufficient data).');
      return;
    }

    // Update keyResult state for UI
    setState((prev) => ({ ...prev, keyResult: result }));
  }, []);

  /**
   * Starts capturing audio from the microphone.
   * Sets up AudioContext, MediaStreamAudioSourceNode, and AnalyserNode.
   */
  const startCapture = useCallback(async () => {
    // Reset state for new capture session
    setState({
      isCapturing: false,
      error: null,
      currentNote: null,
      detectedNotes: [],
      keyResult: null,
    });

    // Clear previously collected notes
    collectedNotesRef.current = [];

    try {
      // Step 1: Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      mediaStreamRef.current = stream;

      // Step 2: Create AudioContext
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Step 2.5: Initialize pitch detector with the correct sample rate
      const pitchDetector = createPitchDetector({
        sampleRate: audioContext.sampleRate,
        bufferSize: 4096,
      });

      // Set up callback for when notes complete (with duration)
      pitchDetector.setOnNoteComplete(handleNoteComplete);
      pitchDetectorRef.current = pitchDetector;

      // Step 3: Create MediaStreamAudioSourceNode from the stream
      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      // Step 4: Create low-pass filter to remove high frequencies (reduces YIN errors)
      // Cutoff at 1500Hz - well above human voice range (80-1100Hz) but removes ultrasonic noise
      const lowpassFilter = audioContext.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.value = 1500;
      lowpassFilter.Q.value = 1; // Gentle rolloff
      lowpassFilterRef.current = lowpassFilter;

      // Step 5: Create AnalyserNode for reading audio data
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 4096; // Larger buffer for better low-frequency resolution
      // smoothingTimeConstant = 0 for raw data (no temporal blur between frames)
      // This is critical for accurate pitch detection
      analyserNode.smoothingTimeConstant = 0;
      analyserNodeRef.current = analyserNode;

      // Step 6: Connect source -> lowpass filter -> analyser
      sourceNode.connect(lowpassFilter);
      lowpassFilter.connect(analyserNode);

      // Update state - preserve empty arrays/nulls, just set capturing
      setState((prev) => ({ ...prev, isCapturing: true, error: null }));

      // Step 7: Start reading audio data
      readAudioData();
      console.log('[TrueKey Audio] Started capturing audio data...');
    } catch (err) {
      // Handle permission errors gracefully
      let errorMessage = 'Failed to access microphone';

      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            errorMessage = 'Microphone permission denied. Please allow microphone access.';
            break;
          case 'NotFoundError':
            errorMessage = 'No microphone found. Please connect a microphone.';
            break;
          case 'NotReadableError':
            errorMessage = 'Microphone is already in use by another application.';
            break;
          case 'OverconstrainedError':
            errorMessage = 'No suitable microphone found for the requested constraints.';
            break;
          default:
            errorMessage = `Microphone error: ${err.message}`;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      console.error('[TrueKey Audio] Error:', errorMessage);
      setState((prev) => ({ ...prev, isCapturing: false, error: errorMessage }));
    }
  }, [readAudioData, handleNoteComplete]);

  /**
   * Stops audio capture, analyzes collected notes, and cleans up resources.
   */
  const stopCapture = useCallback(() => {
    console.log('[TrueKey Audio] Stopping audio capture...');

    // Cancel animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Cancel silence timeout
    if (silenceTimeoutRef.current !== null) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Flush the pitch detector to get the last note's duration
    if (pitchDetectorRef.current) {
      pitchDetectorRef.current.flush();
      pitchDetectorRef.current.reset();
      pitchDetectorRef.current = null;
    }

    // Disconnect and close audio nodes
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (lowpassFilterRef.current) {
      lowpassFilterRef.current.disconnect();
      lowpassFilterRef.current = null;
    }

    if (analyserNodeRef.current) {
      analyserNodeRef.current.disconnect();
      analyserNodeRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop all media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    // Analyze collected notes and determine key (ONLY on stop)
    analyzeCollectedNotes();

    setState((prev) => ({ ...prev, isCapturing: false, currentNote: null }));
    console.log('[TrueKey Audio] Audio capture stopped and resources cleaned up.');
  }, [analyzeCollectedNotes]);

  return {
    isCapturing: state.isCapturing,
    error: state.error,
    currentNote: state.currentNote,
    detectedNotes: state.detectedNotes,
    keyResult: state.keyResult,
    startCapture,
    stopCapture,
  };
}
