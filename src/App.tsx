import { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { MenuDisplay } from './components/MenuDisplay';
import { processFile } from './utils/fileProcessor';
import { extractMenuFromImage, OpenRouterError } from './api/openRouter';
import type { AppState, FileItem } from './types';
import './App.css';

const INITIAL_STATE: AppState = {
  status: 'idle',
  files: [],
};

function makeFileItem(file: File): FileItem {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
    file,
    fileName: file.name,
    status: 'pending',
    menu: null,
    error: null,
  };
}

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  // Add files to the queue (deduplicates by name+size)
  const handleFilesSelect = useCallback((incoming: File[]) => {
    setState(prev => {
      const existingKeys = new Set(prev.files.map(f => `${f.fileName}-${f.file.size}`));
      const newItems = incoming
        .filter(f => !existingKeys.has(`${f.name}-${f.size}`))
        .map(makeFileItem);
      if (newItems.length === 0) return prev;
      return {
        status: 'ready',
        files: [...prev.files, ...newItems],
      };
    });
  }, []);

  // Remove a single file from the list
  const handleRemoveFile = useCallback((id: string) => {
    setState(prev => {
      const next = prev.files.filter(f => f.id !== id);
      return {
        status: next.length === 0 ? 'idle' : prev.status === 'done' ? 'done' : 'ready',
        files: next,
      };
    });
  }, []);

  // Extract all pending files in parallel
  const handleExtract = useCallback(async () => {
    setState(prev => {
      if (prev.status !== 'ready') return prev;
      return {
        status: 'processing',
        files: prev.files.map(f =>
          f.status === 'pending' ? { ...f, status: 'processing' as const } : f
        ),
      };
    });

    // Snapshot the pending files at click time
    const toProcess = state.files.filter(f => f.status === 'pending');

    await Promise.all(
      toProcess.map(async (item) => {
        try {
          const processed = await processFile(item.file);
          const menu = await extractMenuFromImage(processed.base64, processed.mimeType);
          setState(prev => ({
            ...prev,
            files: prev.files.map(f =>
              f.id === item.id ? { ...f, status: 'success' as const, menu } : f
            ),
          }));
        } catch (err) {
          const message =
            err instanceof OpenRouterError
              ? err.message
              : err instanceof Error
              ? err.message
              : 'An unexpected error occurred.';
          setState(prev => ({
            ...prev,
            files: prev.files.map(f =>
              f.id === item.id ? { ...f, status: 'error' as const, error: message } : f
            ),
          }));
        }
      })
    );

    // After all settle, move to 'done'
    setState(prev => ({ ...prev, status: 'done' }));
  }, [state.files]);

  // Retry a single failed file
  const handleRetryFile = useCallback(async (id: string) => {
    const item = state.files.find(f => f.id === id);
    if (!item) return;

    setState(prev => ({
      ...prev,
      files: prev.files.map(f =>
        f.id === id ? { ...f, status: 'processing' as const, error: null } : f
      ),
    }));

    try {
      const processed = await processFile(item.file);
      const menu = await extractMenuFromImage(processed.base64, processed.mimeType);
      setState(prev => ({
        ...prev,
        files: prev.files.map(f =>
          f.id === id ? { ...f, status: 'success' as const, menu } : f
        ),
      }));
    } catch (err) {
      const message =
        err instanceof OpenRouterError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'An unexpected error occurred.';
      setState(prev => ({
        ...prev,
        files: prev.files.map(f =>
          f.id === id ? { ...f, status: 'error' as const, error: message } : f
        ),
      }));
    }
  }, [state.files]);

  const handleReset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const { status, files } = state;

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingCount = files.filter(f => f.status === 'processing').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const isExtracting = processingCount > 0;
  const hasSuccesses = successCount > 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-mark">▤</div>
        <div>
          <h1 className="app-title">Menu Extractor</h1>
        </div>
      </header>

      <main className="app-main">

        {/* ── Idle ── */}
        {status === 'idle' && (
          <div className="upload-section">
            <FileUpload onFilesSelect={handleFilesSelect} />
            <p className="hint-text">
              Upload one or more photos or PDF scans of a restaurant menu — we'll extract all items instantly.
            </p>
          </div>
        )}

        {/* ── Ready / Processing / Done ── */}
        {(status === 'ready' || status === 'processing' || status === 'done') && (
          <div className="multi-section">

            {/* Upload zone — always visible so more files can be added */}
            {status !== 'processing' && (
              <FileUpload onFilesSelect={handleFilesSelect} disabled={isExtracting} />
            )}

            {/* File queue */}
            {files.length > 0 && (
              <div className="file-queue">
                <div className="file-queue-header">
                  <span className="file-queue-title">
                    {files.length} file{files.length !== 1 ? 's' : ''} queued
                  </span>
                  {(status === 'ready') && (
                    <button className="clear-all-btn" onClick={handleReset}>
                      Clear all
                    </button>
                  )}
                </div>

                <div className="file-queue-list">
                  {files.map(item => (
                    <div key={item.id} className={`file-queue-item status-${item.status}`}>
                      <div className="fq-icon">
                        {item.status === 'pending' && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="2" y="1" width="9" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                            <path d="M11 1l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                            <rect x="11" y="1" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                          </svg>
                        )}
                        {item.status === 'processing' && (
                          <div className="fq-spinner" />
                        )}
                        {item.status === 'success' && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                            <path d="M4.5 8l2.5 2.5L11.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {item.status === 'error' && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                            <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                          </svg>
                        )}
                      </div>

                      <div className="fq-info">
                        <span className="fq-name">{item.fileName}</span>
                        {item.status === 'pending' && (
                          <span className="fq-sub">Waiting</span>
                        )}
                        {item.status === 'processing' && (
                          <span className="fq-sub fq-sub--active">Extracting…</span>
                        )}
                        {item.status === 'success' && (
                          <span className="fq-sub fq-sub--success">
                            {item.menu?.reduce((s, c) => s + c.entries.length, 0)} items extracted
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="fq-sub fq-sub--error" title={item.error ?? ''}>
                            Failed — {item.error?.slice(0, 60)}{(item.error?.length ?? 0) > 60 ? '…' : ''}
                          </span>
                        )}
                      </div>

                      <div className="fq-actions">
                        {item.status === 'error' && (
                          <button
                            className="fq-action-btn retry"
                            onClick={() => handleRetryFile(item.id)}
                            title="Retry"
                          >
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                              <path d="M11 6.5A4.5 4.5 0 112 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                              <path d="M11 3.5V6.5H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                        {(item.status === 'pending' || item.status === 'error') && (
                          <button
                            className="fq-action-btn remove"
                            onClick={() => handleRemoveFile(item.id)}
                            title="Remove"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extract button — only visible when there are pending files and not currently extracting */}
            {pendingCount > 0 && !isExtracting && (
              <button className="extract-btn" onClick={handleExtract}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3v9M5.5 8.5L9 12l3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 15h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Extract {pendingCount} Menu{pendingCount !== 1 ? 's' : ''}
              </button>
            )}

            {/* Progress summary while extracting */}
            {isExtracting && (
              <div className="extraction-progress">
                <div className="spinner-small" />
                <span>
                  Extracting {processingCount} file{processingCount !== 1 ? 's' : ''}…
                  {successCount > 0 && ` · ${successCount} done`}
                  {errorCount > 0 && ` · ${errorCount} failed`}
                </span>
              </div>
            )}

            {/* Results */}
            {hasSuccesses && (
              <div className="result-section">
                <MenuDisplay files={files} />
              </div>
            )}

            {/* Bottom actions when done */}
            {status === 'done' && (
              <div className="done-actions">
                <button className="new-upload-btn" onClick={handleReset}>
                  ↑ Start Over
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      <footer className="app-footer">
        <span>Powered by OpenRouter · Images processed client-side</span>
      </footer>
    </div>
  );
}
