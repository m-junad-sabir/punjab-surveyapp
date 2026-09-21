import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

function AndroidPhone({ children }: { children: React.ReactNode }) {
  const [time, setTime] = React.useState('');

  React.useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <div className="phone-frame">
        {/* Android status bar */}
        <div className="phone-statusbar">
          <span className="status-time">{time}</span>
          <span className="status-icons">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4 2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
            </svg>
            <svg width="12" height="10" viewBox="0 0 24 24" fill="white">
              <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
            </svg>
          </span>
        </div>

        {/* App content */}
        <div className="phone-content">
          {children}
        </div>

        {/* Android navigation bar */}
        <div className="phone-homeindicator" />
      </div>

      <div className="desktop-label">
        Punjab Industrial Survey • Android App Preview
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AndroidPhone>
      <App />
    </AndroidPhone>
  </React.StrictMode>,
);
