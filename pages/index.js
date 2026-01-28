// pages/index.js
import { useState } from 'react';

export default function Home() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileCount, setFileCount] = useState(0);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    setFileCount(files.length);
    setLoading(true);
    setError(null);

    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));

    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceClass = (place) => {
    if (place === 'Гран-при') return 'place-gran-pri';
    if (place === '1 место') return 'place-1';
    if (place === '2 место') return 'place-2';
    if (place === '3 место') return 'place-3';
    return 'place-participant';
  };

  return (
    <div className="container">
      <h1>🏆 Оценка команд</h1>
      
      <label className="upload-area">
        <input type="file" multiple accept=".xlsx,.xls" onChange={handleUpload} />
        <div className="upload-btn">
          📁 Выбрать файлы Excel
        </div>
        {fileCount > 0 && (
          <div className="file-count">Выбрано файлов: {fileCount}</div>
        )}
      </label>
      
      {loading && <div className="loading">Обработка файлов</div>}
      {error && <div className="error">❌ Ошибка: {error}</div>}
      
      {results && (
        <>
          <div className="results-header">
            <h2>Результаты ранжирования</h2>
            <div style={{color: '#718096'}}>Команд: {results.length}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Команда</th>
                <th>Итог</th>
                <th>К1</th>
                <th>К2</th>
                <th>К3</th>
                <th>К4</th>
                <th>К5</th>
                <th>К1_К2</th>
                <th>Место</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td><strong>{i}</strong></td>
                  <td><strong>{r.Команда}</strong></td>
                  <td><strong>{r.Итог}</strong></td>
                  <td>{r.К1}</td>
                  <td>{r.К2}</td>
                  <td>{r.К3}</td>
                  <td>{r.К4}</td>
                  <td>{r.К5}</td>
                  <td>{r.К1_К2}</td>
                  <td>
                    <span className={getPlaceClass(r.Место)}>
                      {r.Место}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
