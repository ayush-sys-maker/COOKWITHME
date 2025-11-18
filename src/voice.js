import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function VoiceInput({ onQuestionChange, onAnswerChange, currentConversation, onSetCurrentConversation, onRefreshConversations, onRefreshMessages }){
    const [isRecording,setIsRecording] = useState(false);
    const [question,setQuestion] = useState('');
    const [answer,setAnswer] = useState('');
    const [isSpeaking,setIsSpeaking] = useState(false);

    // Use REACT_APP_API_URL or fallback to localhost backend
    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    const speak = (text) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
        return;
      }
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
   
      
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
    
      utterance.onend = () => {
        setIsSpeaking(false);
        if (isRecording && recognitionRef.current) { // Only restart if we should be listening
          try { recognitionRef.current.start(); } catch (e) { /* ignore */ }
        }
      };
    
      window.speechSynthesis.speak(utterance);
    };
    const recognitionRef = useRef(null);
    useEffect(() => {
      return () => {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      };
    }, []);


    const askGemini = async (query) => {
      try {
        const response = await axios.post(`${API_BASE}/ask-cooking-assistant`, {
          question: query,
          conversationId: currentConversation?.id || null,
          language: 'en'
        }, {
          withCredentials: true
        });
    
        const data = response.data; 

        // Update Home conversation if backend created a new one
        if (data.conversationId && (!currentConversation || currentConversation.id !== data.conversationId)) {
          onSetCurrentConversation && onSetCurrentConversation({
            id: data.conversationId,
            title: (query || '').split(' ').slice(0,5).join(' ') || 'Untitled Chat'
          });
        }

        // Refresh the messages list in Home (prevents duplicates)
        const convIdToRefresh = data.conversationId || currentConversation?.id;
        if (convIdToRefresh && onRefreshMessages) {
          onRefreshMessages(convIdToRefresh);
        }

        // Optionally refresh side list
        onRefreshConversations && onRefreshConversations();

        setAnswer(data.answer);
        if (onAnswerChange) onAnswerChange(data.answer);
        try{
          speak(data.answer);
        }catch(error){
          console.log(error)
        }
         
      } catch (error) {
        console.error('Error:', error);
        if (error?.response?.status === 401) {
          speak("Please login first to use voice assistant");
        } else {
          speak("Sorry, I encountered an error");
        }
      }
    };
    
const handleListen = () =>{
    if('webkitSpeechRecognition' in window){
        const recognition = new window.webkitSpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.lang = 'en-US';
        recognition.interimResults = true;

        recognition.onstart = () =>{
          setIsRecording(true);
          setAnswer('');
          setQuestion('');
        };

        recognition.onresult = (event) => {
          const lastResult = event.results[event.results.length - 1];
          // handle interim; only act on final transcripts
          if (!lastResult.isFinal) return;

          const transcript = lastResult[0].transcript.trim();
          setQuestion(transcript);
          if (onQuestionChange) onQuestionChange(transcript);
          try { recognition.stop(); } catch (e) {}
          askGemini(transcript);
        };

        recognition.onerror = (event) => {
          console.error('Error:', event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        try {
          recognition.start();
        } catch (e) {
          console.error('Recognition start error', e);
        }


    }
    else{
      speak("Sorry, your browser does not support speech recognition");
    }
}



return (
  <div className="container mt-5">
    <div className="row justify-content-center">
      <div className="col-md-6 text-center">
       

        {question && (
          <div className="mt-3 p-3 bg-light rounded">
            <strong>You:</strong> {question}
          </div>
        )}

        {answer && (
          <div className="mt-3 p-3 bg-info text-white rounded">
            <strong>Assistant:</strong> {answer}
          </div>
        )}
      </div>
    </div>
  </div>
);

}

export default VoiceInput;