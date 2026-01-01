import { AudioCapture } from '@/components/AudioCapture';

function App() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <div className="flex flex-col items-center gap-8 p-8 bg-card rounded-xl shadow-lg border border-border max-w-3xl w-full">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent mb-2">
            TrueKey
          </h1>
          <p className="text-muted-foreground">Discover your singing key</p>
        </header>
        <AudioCapture />
      </div>
    </main>
  );
}

export default App;
