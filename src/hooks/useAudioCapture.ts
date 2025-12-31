import { useRef, useState, useCallback } from 'react';
import { createPitchDetector, type PitchDetector } from '@/utils/pitchDetection';

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

  /**
   * Continuously reads time-domain audio data from the AnalyserNode,
   * performs pitch detection, and logs stable notes to console.
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
      const result = pitchDetector.process(dataArray);

      // Log detected stable notes
      if (result) {
        console.log(
          `[TrueKey Pitch] Detected note: ${result.noteName} (${result.frequency.toFixed(1)} Hz, ${result.cents >= 0 ? '+' : ''}${result.cents} cents)`
        );
      }

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  /**
   * Starts capturing audio from the microphone.
   * Sets up AudioContext, MediaStreamAudioSourceNode, and AnalyserNode.
   */
  const startCapture = useCallback(async () => {
    // Reset any previous error
    setState((prev) => ({ ...prev, error: null }));

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
      pitchDetectorRef.current = createPitchDetector({
        sampleRate: audioContext.sampleRate,
        bufferSize: 2048,
      });

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
  }, [readAudioData]);

  /**
   * Stops audio capture and cleans up all audio resources.
   */
  const stopCapture = useCallback(() => {
    console.log('[TrueKey Audio] Stopping audio capture...');

    // Cancel animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Reset pitch detector
    if (pitchDetectorRef.current) {
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
        console.log('[TrueKey Audio] Media track stopped:', track.kind);
      });
      mediaStreamRef.current = null;
    }

    setState({ isCapturing: false, error: null });
    console.log('[TrueKey Audio] Audio capture stopped and resources cleaned up.');
  }, []);

  return {
    isCapturing: state.isCapturing,
    error: state.error,
    startCapture,
    stopCapture,
  };
}
