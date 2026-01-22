import { AlertCircle, ArrowLeft } from 'lucide-react';

interface ErrorViewProps {
  message: string;
  onBack: () => void;
}

export function ErrorView({ message, onBack }: ErrorViewProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center border border-red-200">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" strokeWidth={1.5} />
        <h2 className="text-xl font-light text-gray-900 mb-2">Oops!</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 bg-pink-400 hover:bg-pink-500 text-white rounded-lg transition-colors font-light"
        >
          <ArrowLeft className="w-5 h-5" />
          Try Again
        </button>
      </div>
    </div>
  );
}
