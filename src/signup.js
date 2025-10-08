import React,{useState} from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import axios from 'axios';


function Signup() {
    const [username,setusername] = useState("")
      const [password,setpassword] = useState("")
    
    
    const handelsumbit = async(e)=>{
      e.preventDefault()
      try{
        const response = await axios.post("https://cookwithme.onrender.com/signup",{
          username,
          password
        },{
            withCredentials: true
        })
       if(response.data.success){
     window.location.href = '/'; 
       }
        
        
      }catch(error){
        alert("error in signup")
    
      }
      
        
    }
    
    return (
       <div className="container">
      

         <div className="login">

         <div className="card " >

      <div className="card-body  shadow-lg  ">

        <div className="authbrandname mx-auto mt-1  mb-4  ">
            <p className="mt-3"> <span><img src="COOKWITHME-LOGO.png" style={{width:"30px",height:"30px",  marginTop:"-10px",  }} alt="logo" className="me-2" /></span><span className='logoname'>COOKWITHME</span></p>
          </div>
<form  onSubmit={handelsumbit}  >
<input  className='form-control mb-4  mt-4 bg-transparent border-1 ' value={username} onChange={(e)=>setusername(e.target.value)} type="text" placeholder="Username" />
<input className='form-control mb-4 mt-4 bg-transparent border-1 ' value={password} onChange={(e)=>setpassword(e.target.value)} type="password" placeholder="Password" />
<input className='form-control mb-4 mt-4 bg-transparent border-1 ' type="password" placeholder="Confirm Password" />
<button className='btn btn-success d-flex justify-content-center align-items-center ms-auto me-auto' type="submit"> Sign Up</button>
</form>
<div className="google">
            <div className="mt-4">
                <button className="btn  d-flex justify-content-center align-items-center w-100" type="submit">
                    <img src="https://img.icons8.com/color/48/000000/google-logo.png" style={{width:"25px",height:"25px"}} alt="google" className="me-2" />
                    Continue with Google
                </button>
            </div>

</div>

   
        </div>
    </div>





         </div>




        </div>
    );
}


export default Signup;
