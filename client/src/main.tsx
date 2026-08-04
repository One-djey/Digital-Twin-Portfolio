import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log(
  "%c👋 Hey there, curious one.",
  "font-size:16px;font-weight:bold;color:#7c3aed",
);
console.log(
  "If the chat glitches or gets messy, type %cresetChat()%c here to clear it.",
  "font-family:monospace;color:#7c3aed",
  "color:inherit",
);

declare global {
  interface Window {
    resetChat: () => void;
  }
}

// Easter egg: looks like a chat reset, actually a Rickroll.
window.resetChat = () => {
  window.open("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "_blank");
};

createRoot(document.getElementById("root")!).render(<App />);
