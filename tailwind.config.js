/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  // Light-only app: the "dark" class is never applied, so dark: variants and
  // prefers-color-scheme never change the UI.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // [0] SubMate semantic tokens (light theme only) - C2 system
        // Neutral Toss-like gray scale. 400 is decoration/placeholder only (3.0:1);
        // 500 and darker pass 4.5:1 on white. See outputs/design-concepts/c2/tokens.md.
        gray: { 50: "#F9FAFB", 100: "#F2F4F6", 200: "#E5E8EB", 300: "#D1D6DB", 400: "#8B95A1", 500: "#646E7C", 600: "#4E5968", 700: "#333D4B", 800: "#252C38", 900: "#191F28" },
        // "brand" is the primary action color. C2 has no hue accent: primary = ink.
        brand: {
          DEFAULT: "#191F28", hover: "#333D4B", pressed: "#0B0F15", // white text 16.6:1
          soft: "#F2F4F6", "soft-strong": "#E5E8EB", line: "#D1D6DB",
          ink: "#191F28",
        },
        ink: {
          DEFAULT: "#191F28",   // primary text 16.6:1
          secondary: "#333D4B", // 11.0:1
          muted: "#4E5968",     // secondary text 7.1:1
          tertiary: "#646E7C",  // meta/labels 5.2:1 (4.7:1 on gray-100)
          subtle: "#8B95A1",    // placeholder/decoration only 3.0:1
        },
        // Semantic red for urgency/destructive. #E42939 (TDS red600) is 4.49:1, so the
        // text/fill value is darkened to #D22030 (5.3:1 on white, white text 5.3:1).
        danger: { DEFAULT: "#D22030", soft: "#FFF0F0", line: "#FBCACE" },

        // Legacy eucalyptus families now resolve to the same neutral scale so old classes turn gray.
        eucalyptus: {
          sage: { 50: "#F9FAFB", 100: "#F2F4F6", 200: "#E5E8EB", 300: "#D1D6DB", 400: "#8B95A1", 500: "#646E7C", 600: "#4E5968", 700: "#333D4B", 800: "#252C38", 900: "#191F28" },
          gray: { 50: "#F9FAFB", 100: "#F2F4F6", 200: "#E5E8EB", 300: "#D1D6DB", 400: "#8B95A1", 500: "#646E7C", 600: "#4E5968", 700: "#333D4B", 800: "#252C38", 900: "#191F28" },
          green: { 50: "#F9FAFB", 100: "#F2F4F6", 200: "#E5E8EB", 300: "#D1D6DB", 400: "#8B95A1", 500: "#646E7C", 600: "#4E5968", 700: "#333D4B", 800: "#252C38", 900: "#191F28" },
        },
        // [1] Primitive Palette (100 Colors from Figma: 10 Hues x 10 Steps)
        palette: {
          gray: { 50: "#F9FAFB", 100: "#F2F4F6", 200: "#E5E8EB", 300: "#D1D6DB", 400: "#8B95A1", 500: "#646E7C", 600: "#4E5968", 700: "#333D4B", 800: "#252C38", 900: "#191F28" },
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
