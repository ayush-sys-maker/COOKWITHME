import React, { useState } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Signup() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('Signup attempt:', { username, password });
    
    try {
      const response = await axios.post(
        "https://cookwithme.onrender.com/signup", 
        {
          username,
          password
        }, 
        {
          withCredentials: true
        }
      );
      
      console.log('Signup response:', response.data);
      
      if (response.data.success) {
        alert("🎉 Signup successful! Please login.");
        window.location.href = '/login'; 
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      if (error.response && error.response.data && error.response.data.error) {
        alert("❌ " + error.response.data.error);
      } else {
        alert("❌ Error in signup");
      }
    }
  }

  return (
    <div className="container">
      <div className="login">
        <div className="card">
          <div className="card-body w-100 shadow-lg">
            <div className="authbrandname mx-auto mt-1 mb-4">
              <p className="mt-3">
                <span className='logoimg'>
                  <img src="COOKWITHME-LOGO.png" style={{width:"30px",height:"30px", marginTop:"-10px"}} alt="logo" className="me-2" />
                </span>
                <span className='logoname'>COOKWITHME</span>
              </p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <input 
                className='form-control mb-4 mt-4 bg-transparent border-1' 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                type="text" 
                placeholder="Username" 
                required
              />
              <input 
                className='form-control mb-4 mt-4 bg-transparent border-1' 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                type="password" 
                placeholder="Password" 
                required
              />
              <button 
                className='btn btn-success d-flex justify-content-center align-items-center ms-auto me-auto' 
                type="submit"
              >
                Sign Up
              </button>
              <p className='mt-4 ms-auto me-auto text-center'>
                Already have an account? <Link to="/login">Login</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;