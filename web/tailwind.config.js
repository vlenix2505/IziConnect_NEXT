/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: { izi: { red:'#E30613', orange:'#F58220', bg:'#0B1220', panel:'#0F172A' } },
      boxShadow: { card:'0 6px 14px rgba(0,0,0,0.35)' },
      borderRadius: { xl2:'1rem' }
    }
  },
  plugins: [require('@tailwindcss/forms')],
}
