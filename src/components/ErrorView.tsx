import { AlertCircle, ArrowLeft } from 'lucide-react';

interface ErrorViewProps {
  message: string;
  onBack: () => void;
}

export function ErrorView({ message, onBack }: ErrorViewProps) {
  return (
    <div className="min-h-screen bg-matcha-bg flex flex-col items-center justify-center p-6">
      <div className="bg-matcha-card rounded-[20px] p-8 max-w-md w-full text-center border border-matcha-border">
        <AlertCircle className="w-16 h-16 text-matcha-primary mx-auto mb-4" strokeWidth={1.5} />
        <h2 className="text-xl font-bold text-matcha-text mb-2">Oops!</h2>
        <p className="text-matcha-muted mb-6">{message}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 h-12 bg-matcha-primary hover:opacity-90 text-matcha-onPrimary rounded-full transition-opacity font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Try Again
        </button>
      </div>
    </div>
  );
}
