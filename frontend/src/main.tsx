import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./store/store";

import "@arcgis/core/assets/esri/themes/light/main.css";
import "./index.css";
import esriConfig from "@arcgis/core/config";

const apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
if (apiKey) {
  esriConfig.apiKey = apiKey;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
