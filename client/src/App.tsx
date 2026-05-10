import React, { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    fetch('http://localhost:8080/')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="App">
      <h1>{message}</h1>
    </div>
  );
}

export default App;
