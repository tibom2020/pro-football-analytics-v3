
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './tailwind.css';
import { SimilarMatchTabPage, parseSimilarMatchTabParams } from './components/SimilarMatchTabPage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const simMatchParams = parseSimilarMatchTabParams();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {simMatchParams ? (
        <SimilarMatchTabPage params={simMatchParams} />
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </React.StrictMode>
);
