/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
    content: ["./src/**/*.{vue,js,ts"],
    theme: {
        extend:{ fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        // Add other custom font families if needed
        grotesk: ['"Space Grotesk"', ...defaultTheme.fontFamily.sans],
      },}
    },
    plugins:[],
};