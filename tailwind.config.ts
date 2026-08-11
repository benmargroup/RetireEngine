import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B365D',
          light: '#2A4A7A',
          dark: '#122442',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#D4B86A',
          dark: '#A8873A',
        },
        cream: {
          DEFAULT: '#F9F8F6',
          dark: '#EDE7DC',
        },
        crimson: {
          DEFAULT: '#9B2C3E',
          light: '#B23A4E',
          dark: '#7A1F2F',
        },
        forest: {
          DEFAULT: '#2C5F4E',
          light: '#3C7A63',
          dark: '#1E4136',
        },
        charcoal: '#1E293B',
        sage: {
          DEFAULT: '#7A8C7E',
          light: '#9CAD9F',
        },
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
