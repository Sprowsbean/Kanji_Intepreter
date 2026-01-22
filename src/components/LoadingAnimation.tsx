import { BookOpen } from 'lucide-react';

export function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="relative">
        <div className="animate-bounce">
          <BookOpen className="w-16 h-16 text-pink-400" strokeWidth={1.5} />
        </div>
        <div className="absolute inset-0 animate-ping opacity-20">
          <BookOpen className="w-16 h-16 text-pink-400" strokeWidth={1.5} />
        </div>
      </div>
      <p className="mt-8 text-xl text-gray-800 font-light tracking-wide">
        Sensei is thinking...
      </p>
      <div className="mt-4 flex gap-2">
        <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
}
