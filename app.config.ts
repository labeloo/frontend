// app.config.ts
export default defineAppConfig({
  ui: {
    // RENK AYARLARI (Hatanın çözümü: colors objesi içine aldık)
    colors: {
      primary: 'green',
      secondary: 'orange',
      neutral: 'slate', // "gray" yerine "neutral" kullanıyoruz
    },

    // BUTON AYARLARI (Hatanın çözümü: 'default' yerine 'defaultVariants' veya sadeleştirme)
    button: {
      // 'default' özelliği Nuxt UI v3/Latest'ta 'defaultVariants' olabilir
      // Ancak hata almamak için şimdilik sadece slotlara odaklanalım.
      slots: {
        // 'base' genelde kabul edilir ama hata veriyorsa 'root' deneyelim 
        // veya şimdilik boş bırakalım, önce sistem çalışsın.
        base: 'font-bold', 
      }
    }
  }
})