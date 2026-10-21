import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { CameraCapture } from './components/CameraCapture';
import { LoadingAnimation } from './components/LoadingAnimation';
import { ResultsView } from './components/ResultsView';
import { ErrorView } from './components/ErrorView';
import { analyzeKanjiImage } from './services/api';
import type { KanjiCard } from './types/kanji';

type AppState = 'home' | 'camera' | 'loading' | 'results' | 'error';

function App() {
  const [state, setState] = useState<AppState>('home');
  const [kanjiCards, setKanjiCards] = useState<KanjiCard[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCameraClick = () => {
    setState('camera');
  };

  const handleCapture = async (file: File) => {
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

  const handleFileSelect = async (file: File) => {
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
      {state === 'loading' && <LoadingAnimation />}
      {state === 'results' && <ResultsView cards={kanjiCards} onBack={handleBack} />}
      {state === 'error' && <ErrorView message={errorMessage} onBack={handleBack} />}
    </>
  );
}

export default App;
