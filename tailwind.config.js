/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Eucalyptus Grove Custom Palette (from Figma)
        eucalyptus: {
          sage: {
            50: "#F8F7F3", 100: "#F1EFE6", 200: "#E3DFCFA", 300: "#D5D0BC", 400: "#C4BEA2",
            500: "#B2AC88", 600: "#9B946E", 700: "#7F7954", 800: "#625D3F", 900: "#46422B",
          },
          gray: {
            50: "#FAFAFA", 100: "#F2F0EF", 200: "#E4E2DF", 300: "#D0CECB", 400: "#B1AFA9",
            500: "#898989", 600: "#6E6F6C", 700: "#535450", 800: "#393B37", 900: "#1F221E",
          },
          green: {
            50: "#F2F6F1", 100: "#E4ECE3", 200: "#C9DAC7", 300: "#A7C2A4", 400: "#789E74",
            500: "#4B6E48", 600: "#3E5C3B", 700: "#324B30", 800: "#263924", 900: "#1B291A",
          },
        },
        // [1] Primitive Palette (100 Colors from Figma: 10 Hues x 10 Steps)
        palette: {
          gray: {
            50: "#F9FAFB", 100: "#F2F4F6", 200: "#E5E8EB", 300: "#D1D6DB", 400: "#B0B8C1",
            500: "#8B95A1", 600: "#6B7684", 700: "#4E5968", 800: "#333D4B", 900: "#191F28",
          },
          orange: {
            50: "#FFF5ED", 100: "#FFE8D6", 200: "#FFD2B2", 300: "#FFB380", 400: "#FF924D",
            500: "#FF6F0F", 600: "#E65A00", 700: "#BD4500", 800: "#943400", 900: "#6B2300",
          },
          red: {
            50: "#FFF0F0", 100: "#FFE0E0", 200: "#FFC2C2", 300: "#FF9494", 400: "#FF6666",
            500: "#FF4D4D", 600: "#E03535", 700: "#BA2424", 800: "#941818", 900: "#6E0D0D",
          },
          amber: {
            50: "#FFF9EB", 100: "#FEF0C7", 200: "#FEDF89", 300: "#FEC84B", 400: "#FDB022",
            500: "#F79009", 600: "#DC6803", 700: "#B54708", 800: "#93370D", 900: "#712B08",
          },
          green: {
            50: "#EDFDF4", 100: "#D1FADF", 200: "#A6F4C5", 300: "#6CE9A6", 400: "#32D583",
            500: "#12B76A", 600: "#039855", 700: "#027A48", 800: "#05603A", 900: "#054F31",
          },
          teal: {
            50: "#F0FDF9", 100: "#CCFBEF", 200: "#99F6E0", 300: "#5EEAD4", 400: "#2DD4BF",
            500: "#14B8A6", 600: "#0F766E", 700: "#115E59", 800: "#134E4A", 900: "#042F2E",
          },
          blue: {
            50: "#EFF8FF", 100: "#D1E9FF", 200: "#B2DDFF", 300: "#84CAFF", 400: "#53B1FD",
            500: "#3182F6", 600: "#1570EF", 700: "#175CD3", 800: "#1849A9", 900: "#194185",
          },
          indigo: {
            50: "#EEF4FF", 100: "#E0EAFF", 200: "#C7D7FE", 300: "#A4BCFD", 400: "#8098F9",
            500: "#6172F3", 600: "#444CE7", 700: "#3538CD", 800: "#2D31A6", 900: "#1F235B",
          },
          purple: {
            50: "#F9F5FF", 100: "#F4EBFF", 200: "#E9D7FE", 300: "#D6BBFB", 400: "#B692F6",
            500: "#9E77ED", 600: "#7F56D9", 700: "#6941C6", 800: "#53389E", 900: "#42307D",
          },
          pink: {
            50: "#FDF2F8", 100: "#FCE7F3", 200: "#FBCFE8", 300: "#F9A8D4", 400: "#F472B6",
            500: "#EC4899", 600: "#DB2777", 700: "#BE185D", 800: "#9D174D", 900: "#831843",
          },
        },

        // [2] SEED Semantic Tokens (Role-Based Design)
        surface: {
          base: "var(--color-bg-base)",
          default: "var(--color-bg-surface)",
          subtle: "var(--color-bg-subtle)",
          inset: "var(--color-bg-inset)",
          inverse: "var(--color-bg-inverse)",
          brand: "var(--color-bg-brand)",
          "brand-hover": "var(--color-bg-brand-hover)",
          "brand-active": "var(--color-bg-brand-active)",
        },
        fg: {
          primary: "var(--color-fg-primary)",
          secondary: "var(--color-fg-secondary)",
          tertiary: "var(--color-fg-tertiary)",
          muted: "var(--color-fg-muted)",
          subtle: "var(--color-fg-subtle)",
          inverse: "var(--color-fg-inverse)",
          brand: "var(--color-fg-brand)",
          danger: "var(--color-fg-danger)",
        },
        border: {
          subtle: "var(--color-border-subtle)",
          default: "var(--color-border-default)",
          focus: "var(--color-border-focus)",
        },

        // [3] Domain Status (SubMate Role & Contrast Pairing)
        status: {
          today: {
            bg: "var(--color-status-today-bg)",
            fg: "var(--color-status-today-fg)",
          },
          urgent: {
            bg: "var(--color-status-urgent-bg)",
            fg: "var(--color-status-urgent-fg)",
            border: "var(--color-status-urgent-border)",
          },
          trial: {
            bg: "var(--color-status-trial-bg)",
            fg: "var(--color-status-trial-fg)",
            border: "var(--color-status-trial-border)",
          },
          warning: {
            bg: "var(--color-status-warning-bg)",
            fg: "var(--color-status-warning-fg)",
            border: "var(--color-status-warning-border)",
          },
          success: {
            bg: "var(--color-status-success-bg)",
            fg: "var(--color-status-success-fg)",
            border: "var(--color-status-success-border)",
          },
          ai: {
            bg: "var(--color-status-ai-bg)",
            fg: "var(--color-status-ai-fg)",
            border: "var(--color-status-ai-border)",
          },
        },
      },
    },
  },
  plugins: [],
};
