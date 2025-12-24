import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'; // <--- NIEUW: Importeer de router
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css'; // Vergeet deze niet!
import App from './app.jsx'
import './App.css'

const theme = createTheme({
  primaryColor: 'grape',
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      {/* De BrowserRouter moet om de App heen zitten */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>,
)