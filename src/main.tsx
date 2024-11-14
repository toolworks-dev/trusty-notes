import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import App from "./App";
import './polyfills';

const theme = createTheme({
  primaryColor: 'blue',
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <App />
    </MantineProvider>
  </React.StrictMode>,
);