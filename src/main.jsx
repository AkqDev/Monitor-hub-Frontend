import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress findDOMNode warnings from Ant Design and expected auth errors
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('findDOMNode is deprecated') || 
     args[0].includes('Warning: findDOMNode') ||
     args[0].includes('Token verification failed') ||
     (args[0].includes('API Error') && args[1]?.status === 401))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

ReactDOM.createRoot(document.getElementById("root")).render(
    <App />
);