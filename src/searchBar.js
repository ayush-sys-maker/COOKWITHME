import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { FaArrowUp } from "react-icons/fa6";
import axios from "axios";

const SearchBar = forwardRef(({ onQuestionChange, onAnswerChange, currentConversation, onQuestionSubmit }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [question, setQuestion] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [activeTimer, setActiveTimer] = useState(null);
    const recognitionRef = useRef(null);
    const textareaRef = useRef(null);

    // Use REACT_APP_API_URL or fallback to localhost backend
    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    // Speak function with better error handling
    const speak = (text) => {
    
        try {
            // Check if speech synthesis is supported
            if (!('speechSynthesis' in window)) {
                console.warn('Speech synthesis not supported in this browser');
                return;
            }

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            // Create a new utterance
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Set up event handlers
            utterance.onstart = () => {
                console.log('Speech started');
                setIsSpeaking(true);
            };
            
            utterance.onend = () => {
                console.log('Speech ended');
                setIsSpeaking(false);
            };

         
           
            
            // Speak the text
            window.speechSynthesis.speak(utterance);
            
        } catch (error) {
            console.error('Error in speak function:', error);
            setIsSpeaking(false);
        }
    };

    // Expose the speak function to parent component
    useImperativeHandle(ref, () => ({
        speak,
        isSpeaking: () => isSpeaking
    }));

    useEffect(()=>{
        return () =>{
            if(activeTimer){
                clearTimeout(activeTimer);
            }
            adustheight();
           
        }
    },[activeTimer, question])
    
    
    const setTimer = (command) => {
    
        window.speechSynthesis.cancel(); // stop any AI speech

        // More robust regex pattern to capture different timer commands
        const regex = /set.*timer.*(?:for)?\s*(\d+)\s*(seconds?|minutes?|mins?|secs?)/i;
        const match = command.match(regex);

        if (match) {
            let time = parseInt(match[1]);
            const unit = match[2].toLowerCase();

            // Convert to seconds based on unit
            if (unit.startsWith("min")) time *= 60;

            // Clear any existing timer
            if (activeTimer) {
                clearTimeout(activeTimer);
            }

            // First speak timer set
            speak(`Timer set for ${match[1]} ${unit}`);

            console.log(`⏳ Timer set for ${time} seconds`);

            // Set the timer
            const timerId = setTimeout(() => {
                console.log("⏰ Timer completed!");
                speak("Timer completed!");
                setActiveTimer(null);
            }, time * 1000);
            
            setActiveTimer(timerId);
        } else {
            console.log("Invalid timer command:", command);
            speak("Sorry, I didn't understand the timer command. Please say something like 'set a timer for 5 minutes'");
        }
    };

    const checkAuth = async () => {
        try {
            // ✅ use API_BASE (local or env) instead of hardcoded Render URL
            const response = await axios.get(`${API_BASE}/check-auth`, { withCredentials: true });
            if (!response.data.islogin) {
                speak("Please login first");
                return  false ;
            }
            return true;
        } catch (error) {
            console.error('Error:', error);
            speak("Sorry, I encountered an error");
        }
    };

    const handleSubmit = async (e) => {
        const isAuth = await checkAuth();
        if (!isAuth) return;
      
        e.preventDefault();
        if (!question.trim()) return;
        
        // Store the question in a variable since we'll clear the input
        const currentQuestion = question;
        
        // Clear the input immediately for better UX
        setQuestion('');
        
        try {
            // Update the parent component's question state
            if (onQuestionChange) {
                onQuestionChange(currentQuestion);
            }
            
            // Call the parent's submit handler
            if (onQuestionSubmit) {
                // Create a synthetic event to match the expected format
                const syntheticEvent = { 
                    preventDefault: () => {},
                    target: { value: currentQuestion }
                };
                await onQuestionSubmit(syntheticEvent);
            }
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            speak("Sorry, there was an error processing your question.");
        }
    };

    const handleListen = async () => {

        const isAuth = await checkAuth();
        if (!isAuth) return;
        
        if (!('webkitSpeechRecognition' in window)) {
            speak("Sorry, your browser does not support speech recognition");
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsRecording(true);
            setQuestion('');
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript.trim();
            console.log("Transcript:", transcript);
            
            // Update the input field
            setQuestion(transcript);
            
            // Handle timer commands directly
            const lowerTranscript = transcript.toLowerCase();
            if (lowerTranscript.includes("timer") || lowerTranscript.includes("set timer")) {
                setTimer(lowerTranscript);
                return;
            }
            
            // For regular questions, update the parent's state and submit
            if (onQuestionChange) {
                onQuestionChange(transcript);
                
                // Small delay to ensure state updates before submitting
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (onQuestionSubmit) {
                    const syntheticEvent = { 
                        preventDefault: () => {},
                        target: { value: transcript }
                    };
                    await onQuestionSubmit(syntheticEvent);
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            speak("Sorry, I couldn't understand that. Could you please try again?");
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.start();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };
    


    const adustheight = () => {
        const textarea = textareaRef.current;
        if(textarea){
            textarea.style.height = 'auto';
            textarea.style.height =`${Math.min(textarea.scrollHeight ,150)}px`;
        }
      
    }

    return (
        <div className="searchbar shadow-lg fixed-bottom mb-3 mx-auto" >
            <div className="d-flex align-items-center  searchbar-child ">
                <form onSubmit={handleSubmit} className="w-100">
                    <div className="search">
                        <textarea
                            className="form-control  bg-transparent border-0 py-2 ranade "
                          ref={textareaRef}
                            placeholder="Ask me ..."
                            value={question}
                            onChange={(e) => {
                                setQuestion(e.target.value);
                                onQuestionChange && onQuestionChange(e.target.value);
                            }}
                            onKeyDown={handleKeyDown}
                            onInput={adustheight}
                            rows="1"
                            style={{
                                overflow: 'hidden',
                                resize: 'none',
                                minHeight: '40px',
                                maxHeight: '150px',
                                
                            }}
            
                        />
                        <button 
                            className="btn btn-transparent border-0 fs-4   " 
                            type="button"
                            disabled={!question.trim()}
                        >
                            <FaArrowUp    />
                        </button>
                        <button
                            className={`btn rounded-1  ${isRecording ? 'btn-danger' : 'btn-transparent'}`}
                            type="button"
                            onClick={handleListen}
                            disabled={isSpeaking}
                            
                        >
                            {isRecording ? 'Listening...' : <img src='voice.png ' alt="voice" style={{width:"25px",height:"25px" ,backgroundColor:"transparent"}} ></img>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
});

export default SearchBar;