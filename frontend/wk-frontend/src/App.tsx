import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("/api/hello")
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(() => setMessage("Error calling API"));
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>WK App</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;