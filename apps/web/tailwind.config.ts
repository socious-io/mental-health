import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          25: '#FAFAFF', 50: '#F4F3FF', 100: '#EBE9FE', 200: '#D9D6FE',
          300: '#BDB4FE', 400: '#9B8AFB', 500: '#7A5AF8', 600: '#6938EF',
          700: '#5925DC', 800: '#4A1FB8', 900: '#3E1C96', 950: '#27115F',
        },
        mint: {
          50: '#F0FDF9', 100: '#CCFBEF', 300: '#5FE9D0', 500: '#15B79E',
          600: '#0E9384', 700: '#107569', 900: '#134E48',
        },
        gray: {
          25: '#FCFCFD', 50: '#F9FAFB', 100: '#F2F4F7', 200: '#EAECF0',
          300: '#D0D5DD', 400: '#98A2B3', 500: '#667085', 600: '#475467',
          700: '#344054', 800: '#1D2939', 900: '#101828',
        },
      },
      fontFamily: { sans: ['Nunito', 'Hiragino Sans', 'Noto Sans JP', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
