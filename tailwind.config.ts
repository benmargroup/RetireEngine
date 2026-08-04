import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A1628',
          light: '#132040',
          dark: '#060F1A',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#D4B86A',
          dark: '#A8873A',
        },
        cream: {
          DEFAULT: '#F8F4EE',
          dark: '#EDE7DC',
        },
        sage: {
          DEFAULT: '#7A8C7E',
          light: '#9CAD9F',
        },
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
