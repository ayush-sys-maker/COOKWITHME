import React, { useState, useEffect, useRef } from "react";
import axios from "axios";



function VoiceInput({ onQuestionChange, onAnswerChange, currentConversation, onSetCurrentConversation, onRefreshConversations, onRefreshMessages }){
    const [isRecording,setIsRecording] = useState(false);
    const [question,setQuestion] = useState('');
    const [answer,setAnswer] = useState('');
    const [isSpeaking,setIsSpeaking] = useState(false);

    const speak = (text) => {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
   
      
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
    
      utterance.onend = () => {
        setIsSpeaking(false);
        if (isRecording) { // Only restart if we should be listening
          recognitionRef.current.start(); // Resume listening
        }
      };
    
      window.speechSynthesis.speak(utterance);
    };
    const recognitionRef = useRef(null);
    useEffect(() => {
      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        window.speechSynthesis.cancel();
      };
    }, []);


    const askGemini = async (query) => {
      try {
        const response = await axios.post('https://cookwithme.onrender.com/ask-cooking-assistant', {
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
        const recoginition = new window.webkitSpeechRecognition();
        recognitionRef.current = recoginition;
        recoginition.continuous = true;
        recoginition.lang = 'en-US';
        recoginition.interimResults = true;



recoginition.onstart = () =>{
  setIsRecording(true);
  setAnswer('');
  setQuestion('');
};


recoginition.onresult = (event) => {
  const lastResult = event.results[event.results.length - 1];
  if (!lastResult.isFinal) return;

  const transcript = lastResult[0].transcript;
  setQuestion(transcript);
  if (onQuestionChange) onQuestionChange(transcript);
  recoginition.stop();
  askGemini(transcript);
};

recoginition.onerror = (event) => {
  console.error('Error:', event.error);
  setIsRecording(false);
};

recoginition.onend = () => {
  setIsRecording(false);
};

recoginition.start();


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