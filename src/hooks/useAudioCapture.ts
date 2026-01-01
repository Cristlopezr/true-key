import { useRef, useState, useCallback } from 'react';
import { createPitchDetector, type PitchDetector, type DetectedNote } from '@/utils/pitchDetection';
import { analyzeKeyWithDuration } from '@/utils/keyDetection';

interface AudioCaptureState {
  isCapturing: boolean;
  error: string | null;
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
  });

  // Refs to persist audio nodes across renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pitchDetectorRef = useRef<PitchDetector | null>(null);

  // Ref to collect detected notes WITH DURATION during capture
  const collectedNotesRef = useRef<DetectedNote[]>([]);

  /**
   * Callback when a note completes (with duration info).
   * This is triggered by the pitch detector when a note ends.
   */
  const handleNoteComplete = useCallback((note: DetectedNote) => {
    collectedNotesRef.current.push(note);
    console.log(
      `[TrueKey Pitch] Note completed: ${note.noteName} | Duration: ${note.durationMs}ms | Freq: ${note.frequency.toFixed(1)} Hz`
    );
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

      // Log when a new note starts (for real-time feedback)
      if (result) {
        console.log(
          `[TrueKey Pitch] Note started: ${result.noteName} (${result.frequency.toFixed(1)} Hz)`
        );
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
      console.log('[TrueKey] No notes detected during recording.');
      return;
    }

    // Log summary of collected notes
    const totalDuration = notes.reduce((sum, n) => sum + n.durationMs, 0);
    console.log(`[TrueKey] Analyzing ${notes.length} notes (total duration: ${(totalDuration / 1000).toFixed(1)}s)...`);

    // Run key analysis with duration weighting
    const result = analyzeKeyWithDuration(notes);

    if (!result) {
      console.log('[TrueKey] Could not determine key (insufficient data).');
      return;
    }

    const { primary, alternative, isAmbiguous } = result;

    // Log primary key
    console.log(
      `[TrueKey] Detected key: ${primary.key} ${primary.mode} (confidence: ${Math.round(primary.confidence * 100)}%)`
    );
    console.log(`[TrueKey] Scale notes: ${primary.scaleNotes.join(' – ')}`);

    // Log alternative key if exists (relative major/minor)
    if (alternative) {
      if (isAmbiguous) {
        console.log('[TrueKey] ⚠️ Ambiguous result - could also be:');
      } else {
        console.log('[TrueKey] Alternative (relative key):');
      }
      console.log(
        `[TrueKey] → ${alternative.key} ${alternative.mode} (confidence: ${Math.round(alternative.confidence * 100)}%)`
      );
      console.log(`[TrueKey] → Scale notes: ${alternative.scaleNotes.join(' – ')}`);
    }
  }, []);

  /**
   * Starts capturing audio from the microphone.
   * Sets up AudioContext, MediaStreamAudioSourceNode, and AnalyserNode.
   */
  const startCapture = useCallback(async () => {
    // Reset any previous error
    setState((prev) => ({ ...prev, error: null }));

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
        bufferSize: 2048,
      });

      // Set up callback for when notes complete (with duration)
      pitchDetector.setOnNoteComplete(handleNoteComplete);
      pitchDetectorRef.current = pitchDetector;

      // Step 3: Create MediaStreamAudioSourceNode from the stream
      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      // Step 4: Create AnalyserNode for reading audio data
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048; // Buffer size for time-domain data
      analyserNode.smoothingTimeConstant = 0.8;
      analyserNodeRef.current = analyserNode;

      // Step 5: Connect source -> analyser
      sourceNode.connect(analyserNode);

      // Update state
      setState({ isCapturing: true, error: null });

      // Step 6: Start reading audio data
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
      setState({ isCapturing: false, error: errorMessage });
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

    setState({ isCapturing: false, error: null });
    console.log('[TrueKey Audio] Audio capture stopped and resources cleaned up.');
  }, [analyzeCollectedNotes]);

  return {
    isCapturing: state.isCapturing,
    error: state.error,
    startCapture,
    stopCapture,
  };
}
