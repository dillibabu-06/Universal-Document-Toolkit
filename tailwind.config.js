/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          light: '#fafafa',
          dark: '#111318',
        },
        sidebar: '#16181d',
        panel: {
          light: '#ffffff',
          dark: '#1b1d23',
        },
        elevated: '#20232a',
        hover: '#2a2d35',
        border: {
          light: '#e4e4e7',
          dark: '#272a30',
        },
        accent: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
        },
        // DocuSuite Pro Theme Colors
        "tertiary-container": "#006693",
        "secondary-fixed-dim": "#b7c8e1",
        "inverse-surface": "#2d3133",
        "surface-variant": "#e0e3e5",
        "on-primary-fixed": "#0f0069",
        "primary-container": "#4f46e5",
        "on-error": "#ffffff",
        "surface-bright": "#f7f9fb",
        "surface-container-highest": "#e0e3e5",
        "inverse-on-surface": "#eff1f3",
        "primary": "#3525cd",
        "surface-dim": "#d8dadc",
        "on-secondary": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "on-primary": "#ffffff",
        "surface-container-high": "#e6e8ea",
        "on-tertiary-fixed": "#001e2f",
        "tertiary": "#004d70",
        "surface-tint": "#4d44e3",
        "primary-fixed-dim": "#c3c0ff",
        "on-surface": "#191c1e",
        "error-container": "#ffdad6",
        "on-tertiary-container": "#b8e0ff",
        "secondary": "#505f76",
        "surface-container-low": "#f2f4f6",
        "secondary-fixed": "#d3e4fe",
        "outline": "#777587",
        "on-primary-fixed-variant": "#3323cc",
        "surface-container": "#eceef0",
        "on-tertiary-fixed-variant": "#004c6e",
        "on-background": "#191c1e",
        "secondary-container": "#d0e1fb",
        "on-tertiary": "#ffffff",
        "inverse-primary": "#c3c0ff",
        "on-surface-variant": "#464555",
        "error": "#ba1a1a",
        "on-secondary-fixed": "#0b1c30",
        "background": {
          light: '#fafafa',
          dark: '#111318',
          DEFAULT: '#f7f9fb'
        },
        "on-secondary-fixed-variant": "#38485d",
        "primary-fixed": "#e2dfff",
        "surface": "#f7f9fb",
        "on-secondary-container": "#54647a",
        "on-error-container": "#93000a",
        "on-primary-container": "#dad7ff",
        "outline-variant": "#c7c4d8",
        "tertiary-fixed": "#c9e6ff",
        "tertiary-fixed-dim": "#89ceff"
      },
      spacing: {
        "base": "4px",
        "unit-8": "32px",
        "unit-2": "8px",
        "unit-4": "16px",
        "unit-6": "24px",
        "container-margin": "24px",
        "unit-1": "4px",
        "gutter": "16px"
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
