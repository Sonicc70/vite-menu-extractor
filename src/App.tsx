import { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { MenuDisplay } from './components/MenuDisplay';
import { processFile } from './utils/fileProcessor';
import { extractMenuFromImage, OpenRouterError } from './api/openRouter';
import type { AppState } from './types';
import './App.css';

const INITIAL_STATE: AppState = {
  status: 'idle',
  menu: null,
  error: null,
  fileName: null,
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  const handleFileSelect = useCallback(async (file: File) => {
    setState({ status: 'processing', menu: null, error: null, fileName: file.name });

    try {
      const processed = await processFile(file);
      const menu = await extractMenuFromImage(processed.base64, processed.mimeType);
      setState({ status: 'success', menu, error: null, fileName: file.name });
    } catch (err) {
      const message =
        err instanceof OpenRouterError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'An unexpected error occurred.';
      setState({ status: 'error', menu: null, error: message, fileName: file.name });
    }
  }, []);

  const handleReset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-mark">▤</div>
        <div>
          <h1 className="app-title">Menu Extractor</h1>
          <p className="app-subtitle">AI-powered menu digitization</p>
        </div>
      </header>

      <main className="app-main">
        {state.status === 'idle' && (
          <div className="upload-section">
            <FileUpload onFileSelect={handleFileSelect} />
            <p className="hint-text">
              Upload a photo or scan of any restaurant menu — we'll extract the full item list instantly.
            </p>
          </div>
        )}

        {state.status === 'processing' && (
          <div className="processing-state">
            <div className="spinner" />
            <p className="processing-label">Analyzing menu…</p>
            <p className="processing-sub">{state.fileName}</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="error-state">
            <div className="error-icon">✕</div>
            <h2 className="error-title">Extraction Failed</h2>
            <p className="error-message">{state.error}</p>
            <button className="retry-btn" onClick={handleReset}>Try Again</button>
          </div>
        )}

        {state.status === 'success' && state.menu && (
          <div className="result-section">
            <MenuDisplay menu={state.menu} fileName={state.fileName} />
            <button className="new-upload-btn" onClick={handleReset}>
              ↑ Upload Another Menu
            </button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <span>Powered by OpenRouter · Images processed client-side</span>
      </footer>
    </div>
  );
}
