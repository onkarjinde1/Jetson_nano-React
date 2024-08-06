import React, { useRef, useEffect, useState } from 'react';
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css';

function Dashboard({ user, onLogout }) {
  const videoRef = useRef(null);
  const [models, setModels] = useState([]);
  const [currentModel, setCurrentModel] = useState('');
  const [logs, setLogs] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = '/video_feed';
    }

    fetchModels();
    fetchLogs();
    const logsInterval = setInterval(fetchLogs, 5000);

    return () => clearInterval(logsInterval);
  }, []);

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const response = await fetch('http://localhost:5001/models');
      const data = await response.json();
      setModels(data);
      if (data.length > 0) {
        setCurrentModel(data[0]);
      }
    } catch (error) {
      setError('Error fetching models.');
    } finally {
      setLoadingModels(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch('http://localhost:5001/logs');
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      setError('Error fetching logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const switchModel = async (modelName) => {
    try {
      const response = await fetch('http://localhost:5001/switch_model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: modelName })
      });
      const data = await response.json();
      if (data.message) {
        setCurrentModel(modelName);
        console.log(data.message);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (error) {
      setError('Error switching model.');
    }
  };

  const downloadLogs = () => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(logs, null, 2)
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = 'detection_logs.json';
    link.click();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>Object Detection Using Jetson Nano</h1>

      <div style={{ marginBottom: '20px' }}>
        <h3>Welcome, {user.name}</h3>
        <p>Email: {user.email}</p>
        <button onClick={onLogout} style={styles.logoutButton}>Logout</button>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '1200px',
      }}>
        <div style={styles.videoContainer}>
          <img
            ref={videoRef}
            alt="Live stream"
            style={styles.videoStream}
          />
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ color: '#333' }}>Detection Model: {currentModel}</h3>
            {loadingModels ? (
              <p>Loading models...</p>
            ) : (
              <select
                value={currentModel}
                onChange={(e) => switchModel(e.target.value)}
                style={styles.modelSelect}
              >
                {models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            )}
          </div>
          {error && <p style={styles.error}>{error}</p>}
        </div>

        <div style={styles.logsContainer}>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>Detection Logs</h3>
          <button onClick={downloadLogs} style={styles.downloadButton}>
            Download Logs
          </button>
          <div style={styles.logContent}>
            {loadingLogs ? (
              <p>Loading logs...</p>
            ) : (
              <JSONPretty
                id="json-pretty"
                data={logs.slice(-5).reverse()}
                theme="monokai"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  logoutButton: {
    padding: '10px 15px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginBottom: '10px'
  },
  videoContainer: {
    width: '68%',
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  videoStream: {
    width: '100%',
    height: 'auto',
    borderRadius: '5px'
  },
  modelSelect: {
    width: '100%',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ddd'
  },
  logsContainer: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  downloadButton: {
    padding: '10px 15px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginBottom: '10px'
  },
  logContent: {
    height: '300px',
    overflow: 'auto',
    border: '1px solid #ddd',
    borderRadius: '5px',
    padding: '10px'
  },
  error: {
    color: 'red',
    marginTop: '10px'
  }
};

export default Dashboard;
//