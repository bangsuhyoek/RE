import { createRoot } from "react-dom/client";
import App from "./App";
import { installApiBaseFetchBridge } from "./lib/apiBase";
import "./index.css";
import "./web-theme.css";
import "./dashboard-theme.css";
import "./final-theme.css";
import "./landing-parity-v2.css";
import "./landing-parity-v5.css";
import "./landing-parity-v6.css";
import "./mobile-final.css";
import "./mobile-final-reference.css";

installApiBaseFetchBridge();

createRoot(document.getElementById("root")).render(<App />);
