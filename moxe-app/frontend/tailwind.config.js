/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6a11cb',
        'primary-dark': '#5a0db5',
        'primary-light': '#8a3ffc',
        secondary: '#2575fc',
        accent: '#ff4d8d',
        success: '#00c853',
        warning: '#ffab00',
        danger: '#ff5252',
        dark: '#121212',
        'dark-gray': '#1e1e1e',
        'medium-gray': '#2d2d2d',
        'light-gray': '#3a3a3a',
      },
      borderRadius: {
        'moxe': '16px',
        'moxe-sm': '8px',
      },
    },
  },
  plugins: [],
}



