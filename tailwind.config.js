/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  // 1. DÜZELTME: Nuxt yapısına uygun content yolları
  // Eğer dosyaların 'src' klasörü içindeyse eski hali kalsın, 
  // ama standart Nuxt yapısı kullanıyorsan bunu kullan:
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.{js,vue,ts}",
    "./pages/**/*.{js,vue,ts}",
    "./plugins/**/*.{js,vue,ts}",
    "./app.vue",
    "./error.vue"
  ],
  safelist: [
    {
      // BU REGEX ÇOK ÖNEMLİ: Senin listendeki TÜM renkleri kapsıyor.
      // Eğer burada 'fuchsia' yazmazsa, fuchsia seçilemez.
      pattern: /(bg|text|border|ring)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)/,
      variants: ['hover', 'dark', 'dark:hover', 'focus'],
    }
  ]
  ,
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        grotesk: ['"Space Grotesk"', ...defaultTheme.fontFamily.sans],
      },
      // Eğer özel renklerin varsa buraya eklersin
    }
  },

  // 2. ÇÖZÜM: Safelist (Zorunlu Kısım)
  // Nuxt UI'ın desteklediği renklerin çalışması için bunları CSS'e gömmeliyiz.
  safelist: [
    {
      // Bu regex şunları kapsar: bg-red-500, text-blue-600, ring-green-500 vb.
      // Sadece 400, 500, 600, 900 tonlarını alarak dosya boyutunu koruyoruz.
      pattern: /(bg|text|ring|border)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(400|500|600|900|950)/,
      // Hover ve Dark mode varyasyonlarını da ekle
      variants: ['hover', 'dark', 'dark:hover'],
    }
  ],

  plugins: [],
};