/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js}",
    "./templates/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        'vscode-bg': '#1e1e1e',
        'vscode-sidebar': '#252526',
        'vscode-border': '#3c3c3c',
        'vscode-tab-active': '#1e1e1e',
        'vscode-tab-inactive': '#2d2d2d',
      }
    },
  },
  plugins: [],
}
