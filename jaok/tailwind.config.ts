import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark theme: "ink" = foreground (text), "paper" = background —
        // same token names as before, just flipped, so component markup
        // (bg-paper / text-ink everywhere) didn't need to change.
        ink: "#f5f3f0",
        paper: "#0b0b0d",
        surface: "#17161a",
        accent: "#e5404a",
        brand: {
          purple: "#44368b",
          red: "#e5404a",
          orange: "#f29053",
          pink: "#ed83b1",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(90deg, #44368b, #e5404a, #f29053, #ed83b1)",
      },
    },
  },
  plugins: [],
};

export default config;
