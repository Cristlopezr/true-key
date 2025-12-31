import { AudioCapture } from '@/components/AudioCapture';

function App() {
  return (
    <main className="app">
      <div className="app__container">
        <header className="app__header">
          <h1 className="app__title">TrueKey</h1>
          <p className="app__subtitle">Audio Capture Demo</p>
        </header>
        <AudioCapture />
      </div>
    </main>
  );
}

export default App;
