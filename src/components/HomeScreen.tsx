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
    <div className="min-h-screen bg-matcha-bg flex flex-col justify-between md:justify-center md:gap-14 px-6 pt-[120px] md:pt-10 pb-10">
      <div className="flex flex-col items-center text-center">
        <div className="w-[112px] h-[112px] lg:w-[128px] lg:h-[128px] rounded-[28px] lg:rounded-[32px] bg-matcha-primary flex items-center justify-center">
          <span className="font-kanji font-black text-[60px] lg:text-[68px] leading-none text-matcha-onPrimary">i漢</span>
        </div>
        <h1 className="mt-6 text-4xl lg:text-5xl font-bold text-matcha-text">iKan</h1>
        <p className="mt-2 text-lg text-matcha-muted">IKan read kanji now.</p>
      </div>

      <div className="w-full max-w-md mx-auto">
        <div className="space-y-3">
          <button
            onClick={onCameraClick}
            className="w-full h-[60px] rounded-full bg-matcha-primary text-matcha-onPrimary text-[17px] font-semibold flex items-center justify-center gap-3 transition-opacity hover:opacity-90"
          >
            <Camera className="w-6 h-6" />
            <span>Scan with camera</span>
          </button>

          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="w-full h-[60px] rounded-full border-[1.5px] border-matcha-primary bg-transparent text-matcha-primary text-[17px] font-semibold flex items-center justify-center gap-3 cursor-pointer transition-colors hover:bg-matcha-badge">
              <Upload className="w-6 h-6" />
              <span>Upload a photo</span>
            </div>
          </label>
        </div>

        <p className="mt-5 text-sm text-matcha-muted text-center">
          Point at a sign, menu or textbook page. Get every kanji's reading, meaning and sound.
        </p>
      </div>

      <p className="text-[13px] text-matcha-muted text-center">Free · open source · no account</p>
    </div>
  );
}
