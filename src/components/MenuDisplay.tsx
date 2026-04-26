import { useState, useCallback } from 'react';
import type { MenuData } from '../types';

interface MenuDisplayProps {
  menu: MenuData;
  fileName: string | null;
}

export function MenuDisplay({ menu, fileName }: MenuDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(menu, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [menu]);

  const totalItems = menu.reduce((sum, cat) => sum + cat.entries.length, 0);

  return (
    <div className="menu-display">
      <div className="menu-header">
        <div className="menu-meta">
          {fileName && <span className="file-badge">{fileName}</span>}
          <span className="stats-badge">{menu.length} categories · {totalItems} items</span>
        </div>
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'visual' ? 'active' : ''}`}
            onClick={() => setActiveTab('visual')}
          >
            Preview
          </button>
          <button
            className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON
          </button>
        </div>
      </div>

      {activeTab === 'visual' ? (
        <div className="menu-categories">
          {menu.map((category, ci) => (
            <div key={ci} className="category-block">
              <h3 className="category-title">{category.title}</h3>
              <div className="entries-list">
                {category.entries.map((entry, ei) => (
                  <div key={ei} className="entry-row">
                    <div className="entry-info">
                      <span className="entry-title">{entry.title}</span>
                      {entry.description && (
                        <span className="entry-desc">{entry.description}</span>
                      )}
                    </div>
                    {entry.price && (
                      <span className="entry-price">{entry.price}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="json-panel">
          <pre className="json-code">{JSON.stringify(menu, null, 2)}</pre>
        </div>
      )}

      <div className="menu-footer">
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Copy JSON
            </>
          )}
        </button>
      </div>
    </div>
  );
}
