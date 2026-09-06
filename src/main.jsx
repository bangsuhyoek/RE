import { createRoot } from "react-dom/client";
import App from "./App";
import { installApiBaseFetchBridge } from "./lib/apiBase";
import "./index.css";
import "./mobile-shared.css";
import "./mobile-final.css";
import "./mobile-final-reference.css";

installApiBaseFetchBridge();

createRoot(document.getElementById("root")).render(<App />);
