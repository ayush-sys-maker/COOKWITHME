import React ,{useState} from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { Link } from 'react-router-dom';
import axios from 'axios';
import "./button.css"

function Login() {
  const [username,setusername] = useState("")
  const [password,setpassword] = useState("")

  // Use REACT_APP_API_URL or fallback to localhost backend
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handelsumbit = async(e)=>{
    e.preventDefault()
    try{
      const response = await axios.post(
        `${API_BASE}/login`,
        {
          username,
          password
        },
        {
          withCredentials: true
        }
      )
      if(response.data.success){
        window.location.href = '/'; 
      }
    }catch(error){
      alert("error in login")
    }
  }

  return (
    <div className="container    ">
      <div className="login">
        <div className="card " >
          <div className="card-body w-100  shadow-lg  ">
            <div className="authbrandname mx-auto mt-1  mb-4  ">
              <p className="mt-3"    > <span  className='logoimg'  ><img src="COOKWITHME-LOGO.png" style={{width:"30px",height:"30px",  marginTop:"-10px",  }} alt="logo" className="me-2" /></span><span className='logoname   '>COOKWITHME</span></p>
            </div>
            <form onSubmit={handelsumbit}  >
              <input  className='form-control mb-4  mt-4  border-1 ' value={username} onChange={(e)=>setusername(e.target.value)} type="text" placeholder="Username" />
              <input className='form-control mb-4 mt-4  border-1 ' value={password} onChange={(e)=>setpassword(e.target.value)} type="password" placeholder="Password" />
              <button className='btn-grad-logout  d-flex justify-content-center align-items-center ms-auto me-auto' type="submit">Login</button>
              <p className='mt-4   ms-auto me-auto  text-center'>Don't have an account? <Link to="/signup">Sign Up</Link></p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;