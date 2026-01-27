import React from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home.js';
import Login from './Login.js';
import Signup from './signup.js';  // Fixed import path (capital S)
import VoiceInput from './voice.js';
import Loading from './loading.js';


function App() {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/voice" element={<VoiceInput />} />
          <Route path="/loading" element={<Loading />} />
          </Routes>
      </Router>
    </div>
  );
}

export default App;