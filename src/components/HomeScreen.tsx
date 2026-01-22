import { Camera, Upload } from 'lucide-react';

interface HomeScreenProps {
  onCameraClick: () => void;
  onFileSelect: (file: File) => void;
}

export function HomeScreen({ onCameraClick, onFileSelect }: HomeScreenProps) {
  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-pink-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-light text-gray-900 mb-3 tracking-wide">
          漢字先生
        </h1>
        <p className="text-xl text-gray-600 font-light">Kanji Sensei</p>
        <p className="text-sm text-gray-500 mt-2 font-light">
          Your Japanese character learning companion
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <button
          onClick={onCameraClick}
          className="w-full bg-white hover:bg-pink-50 text-gray-900 font-light text-lg py-6 px-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-4 border-2 border-pink-200"
        >
          <Camera className="w-7 h-7 text-pink-400" strokeWidth={1.5} />
          <span>Camera Scan</span>
        </button>

        <label className="block">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="w-full bg-white hover:bg-pink-50 text-gray-900 font-light text-lg py-6 px-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-4 border-2 border-pink-200 cursor-pointer">
            <Upload className="w-7 h-7 text-pink-400" strokeWidth={1.5} />
            <span>Upload File</span>
          </div>
        </label>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500 font-light max-w-sm">
          Capture or upload an image containing Japanese Kanji characters to get instant translations and learning cards
        </p>
      </div>
    </div>
  );
}
