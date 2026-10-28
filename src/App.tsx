import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { CameraCapture } from './components/CameraCapture';
import { CropView } from './components/CropView';
import { LoadingAnimation } from './components/LoadingAnimation';
import { ResultsView } from './components/ResultsView';
import { ErrorView } from './components/ErrorView';
import { analyzeKanjiImage } from './services/api';
import { DEFAULT_QUAD } from './services/docScan';
import type { Quad } from './services/docScan';
import type { KanjiCard } from './types/kanji';

type AppState = 'home' | 'camera' | 'crop' | 'loading' | 'results' | 'error';

// a photo waiting in the crop step, and where it came from (Back returns there)
interface Pending { file: File; quad: Quad | null; from: 'camera' | 'upload' }

function App() {
  const [state, setState] = useState<AppState>('home');
  const [kanjiCards, setKanjiCards] = useState<KanjiCard[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);

  const handleCameraClick = () => {
    setState('camera');
  };

  const analyze = async (file: File) => {
    setState('loading');
    try {
      const cards = await analyzeKanjiImage(file);
      setKanjiCards(cards);
      setState('results');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(message);
      setState('error');
    }
  };

  // camera: start from the page the live detection found, or from the guide frame the user aimed with
  const handleCapture = (file: File, quad: Quad | null) => {
    setPending({ file, quad: quad ?? DEFAULT_QUAD, from: 'camera' });
    setState('crop');
  };

  // upload: the crop step looks for a page in the picture itself
  const handleFileSelect = (file: File) => {
    setPending({ file, quad: null, from: 'upload' });
    setState('crop');
  };

  const handleCropBack = () => {
    setState(pending?.from === 'camera' ? 'camera' : 'home');
    setPending(null);
  };

  const handleBack = () => {
    setState('home');
    setKanjiCards([]);
    setErrorMessage('');
  };

  const handleCameraClose = () => {
    setState('home');
  };

  return (
    <>
      {state === 'home' && (
        <HomeScreen onCameraClick={handleCameraClick} onFileSelect={handleFileSelect} />
      )}
      {state === 'camera' && (
        <CameraCapture onCapture={handleCapture} onClose={handleCameraClose} />
      )}
      {state === 'crop' && pending && (
        <CropView
          file={pending.file}
          initialQuad={pending.quad}
          onConfirm={analyze}
          onBack={handleCropBack}
          backLabel={pending.from === 'camera' ? 'Retake' : 'Back'}
        />
      )}
      {state === 'loading' && <LoadingAnimation />}
      {state === 'results' && <ResultsView cards={kanjiCards} onBack={handleBack} />}
      {state === 'error' && <ErrorView message={errorMessage} onBack={handleBack} />}
    </>
  );
}

export default App;
