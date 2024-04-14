import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CreateRoom from "./components/CreateRoom";
import Room from "./components/Room";
import process from 'process';

const App: React.FC = () => {

  useEffect(() => {
    window.process = process;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateRoom />} />
        <Route path="/room/:roomID" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
