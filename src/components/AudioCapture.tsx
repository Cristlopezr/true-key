import { useAudioCapture } from '@/hooks/useAudioCapture';
import { Button } from '@/components/ui/button';

/**
 * AudioCapture component provides a minimal UI for starting
 * and stopping microphone audio capture.
 */
export function AudioCapture() {
  const { isCapturing, error, startCapture, stopCapture } = useAudioCapture();

  return (
    <div className="audio-capture">
      <div className="audio-capture__controls">
        {!isCapturing ? (
          <Button onClick={startCapture} variant="default" size="lg">
            Start Capture
          </Button>
        ) : (
          <Button onClick={stopCapture} variant="destructive" size="lg">
            Stop Capture
          </Button>
        )}
      </div>

      {/* Status indicator */}
      <div className="audio-capture__status">
        {isCapturing && (
          <p className="audio-capture__status-text audio-capture__status-text--active">
            🎤 Capturing audio... Check the console for raw data.
          </p>
        )}
        {error && (
          <p className="audio-capture__status-text audio-capture__status-text--error">
            ⚠️ {error}
          </p>
        )}
      </div>
    </div>
  );
}
