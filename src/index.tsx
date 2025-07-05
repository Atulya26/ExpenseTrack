import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import your global CSS (including Tailwind directives)
import ExpenseSharingSystem from './ExpenseSharingSystem'; // Import your main component

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ExpenseSharingSystem />
  </React.StrictMode>
); 