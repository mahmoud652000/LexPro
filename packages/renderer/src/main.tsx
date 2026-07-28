import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';
import App from './App';
import './styles/globals.css';

const theme = {
  token: {
    fontFamily: "'Cairo', 'Tahoma', 'Arial', sans-serif",
    colorPrimary: '#2c3e50',
    borderRadius: 6,
    direction: 'rtl' as const,
  },
  components: {
    Menu: {
      itemBg: 'transparent',
      horizontalItemSelectedColor: '#2c3e50',
      horizontalItemHoverColor: '#2c3e50',
    },
    Table: {
      headerBg: '#2c3e50',
      headerColor: '#ffffff',
      headerSplitColor: '#34495e',
      borderColor: '#e8e8e8',
    },
    Button: {
      borderRadius: 6,
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={arEG} theme={theme} direction="rtl">
      <HashRouter>
        <App />
      </HashRouter>
    </ConfigProvider>
  </React.StrictMode>
);
