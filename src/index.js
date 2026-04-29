import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { WalletProvider } from './context/WalletContext';
import App from './App';
import Gallery from './pages/Gallery';
import Verify from './pages/Verify';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/gallery/:wallet" element={<Gallery />} />
          <Route path="/verify" element={<Verify />} />
        </Routes>
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>
);
