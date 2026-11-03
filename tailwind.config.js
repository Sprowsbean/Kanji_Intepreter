/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // "Matcha" theme
      colors: {
        matcha: {
          bg: '#E8EEDF', // page background
          surface: '#F7F9F2', // sticky headers
          card: '#FFFFFF', // cards, inputs
          tint: '#F2F5EC', // context sentence box, unused reading chips
          badge: '#DCE8CF', // JLPT badge background (text #2E4A2E)
          border: '#C9D3BC',
          divider: '#E3E9DA',
          text: '#1F2E1F',
          muted: '#4A5A47', // secondary text, 4.5:1 or better on every background above
          primary: '#3B5E3B', // buttons, icons, highlighted reading
          onPrimary: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        kanji: ['"Zen Kaku Gothic New"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
