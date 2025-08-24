import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // pulled from the packaging tones
        brand: {
          cream:  "#F7F3EE",
          sand:   "#E9E1D8",
          ink:    "#0F172A",

          terracotta: "#B85A3E",
          clay:       "#C46A4A",
          cacao:      "#5A3D31",
          espresso:   "#4B3A36",

          forest: "#2E6B5E",
          sage:   "#3E7B6A",

          // utility accents
          mint:   "#8FD3C8",
          gold:   "#D9A66A",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, .06)",
        inner: "inset 0 1px 0 rgba(255,255,255,.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
