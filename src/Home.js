import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SearchBar from './searchBar';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { GiHamburger } from "react-icons/gi";
import VoiceInput from './voice';

function Home() {
  const [show, setShow] = useState(false);
  const [homeQuestion, setHomeQuestion] = useState("");
  const [homeAnswer, setHomeAnswer] = useState("");
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('en'); // 'en' for English, 'hi' for Hindi
  const searchBarRef = useRef(null);
  const [showUser, setShowUser] = useState(false);
 
  useEffect(() => {
    const init = async () => {
      try {
        const authResponse = await axios.get("http://localhost:3001/check-auth", {
          withCredentials: true
        });

        if (authResponse.data.islogin) {
          setUser(authResponse.data.user);

          await fetchConversations();

          const savedConversation = localStorage.getItem('currentConversation');
          if (savedConversation) {
            const parsed = JSON.parse(savedConversation);
            setCurrentConversation(parsed);
            await fetchConversationMessages(parsed.id);
          }
        }
      } catch (error) {
        console.log("Initialization error:", error);
      }
    };

    init();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("http://localhost:3001/getconversation", {
        withCredentials: true
      });

      if (response.data && response.data.conversations) {
        setConversations(response.data.conversations);
      } else {
        setError("No conversations found in response");
        setConversations([]);
      }
    } catch (error) {
      console.log("Error fetching conversations:", error);
      setError(error.response?.data?.error || "Failed to load conversations");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationMessages = async (conversationId) => {
    if (!conversationId) {
      setConversationMessages([]);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:3001/getconversation/${conversationId}/messages`,
        { withCredentials: true }
      );

      const messages = response.data.messages || response.data.conversations || [];
      setConversationMessages(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setConversationMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    setConversationMessages([]);
    setHomeQuestion("");
    setHomeAnswer("");
  };

  const generateTitleFromQuestion = (question) => {
    if (!question) return "Untitled Chat";
    const words = question.split(" ");
    if (words.length <= 5) {
      return words.join(" ");
    }
    return words.slice(0, 5).join(" ") + "...";
  };

  const speakResponse = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  // Speak any new homeAnswer coming from VoiceInput
  useEffect(() => {
    if (homeAnswer) {
      speakResponse(homeAnswer);
    }
  }, [homeAnswer]);

  const handelQuestion = async (e) => {
    // Prefer the value coming from the triggering event (SearchBar synthetic submit)
    const incomingValue = e?.target?.value;
    const questionText = typeof incomingValue === 'string' ? incomingValue : homeQuestion;

    if (e?.preventDefault) e.preventDefault();
    if (!questionText || !questionText.trim()) return;
  
    try {
      setLoading(true);
      const userQuestion = questionText.trim();
      setHomeQuestion('');
  
      // Add user question to messages immediately (temporary)
      const tempMessageId = `temp-${Date.now()}`;
      setConversationMessages(prev => [...prev, {
        id: tempMessageId,
        question: userQuestion,
        isTemp: true
      }]);
  
      const response = await axios.post(
        "http://localhost:3001/ask-cooking-assistant",
        {
          question: userQuestion,
          conversationId: currentConversation?.id,
          language: language
        },
        { withCredentials: true }
      );
  
      if (response.data.conversationId) {
        const newConversation = {
          id: response.data.conversationId,
          title: generateTitleFromQuestion(userQuestion)
        };
        setCurrentConversation(newConversation);
        try { localStorage.setItem('currentConversation', JSON.stringify(newConversation)); } catch {}
        // Ensure chat area shows the new conversation messages
        await fetchConversationMessages(newConversation.id);
      }
  
      // Replace temp message with the assistant answer
      setConversationMessages(prev => [
        ...prev.filter(m => m.id !== tempMessageId),
        {
          id: `msg-${Date.now()}`,
          question: userQuestion,
          answer: response.data.answer,
          conversationId: response.data.conversationId
        }
      ]);
  
      if (response.data.answer) {
        speakResponse(response.data.answer);
      }
  
      // Refresh conversations list in sidebar
      await fetchConversations();
    } catch (error) {
      console.error('Error:', error);
      // Remove the temporary message if there's an error
      setConversationMessages(prev => prev.filter(m => !m.isTemp));
    } finally {
      setLoading(false);
    }
  };

  function handleClick() {
    setShow(!show);
  }

  const handleLogout = async () => {
    try {
      const response = await axios.post('http://localhost:3001/logout', {}, { withCredentials: true });
      setUser(null);
      setConversations([]);
      setCurrentConversation(null);
      setConversationMessages([]);
      if (response.data.success) {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handelUserClick = () => {
    setShowUser(!showUser);
  };

  // Clear any leftover homeAnswer when messages list updates to prevent duplicates
  useEffect(() => {
    if (homeAnswer && conversationMessages?.length > 0) {
      setHomeAnswer("");
    }
  }, [conversationMessages]);

  return (
    <div>
      <nav>
        <div className="container d-flex justify-content-between align-items-center">
          <button
            className="hamburger-btn d-lg-none"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#offcanvasExample"
            aria-controls="offcanvasExample"
          >
            <GiHamburger />
          </button>

          <div className="container">
            <div className='brandname'>
              <p className="mt-3">
                <span className="logo">
                  <img src="COOKWITHME-LOGO.png" alt="logo" className="me-2" />
                </span>
              </p>
              <span className="logoname bevellier">COOKWITHME</span>
            </div>

            {!user ? (
              <div className="usericon">
                <img src="user.png" alt="user" onClick={handelUserClick} />
                {showUser && (
                  <div className="mobuser">
                    <Link style={{ textDecoration: "none", color: "black" }} onClick={handelUserClick} to="/login">LOGIN</Link>
                    <Link style={{ textDecoration: "none", color: "black" }} onClick={handelUserClick} to="/signup">SIGNUP</Link>
                  </div>
                )}
              </div>
            ) : ("")}

            <div>
              {user ? (
                <button onClick={handleLogout} className="btn btn-success  mt-4 outbtn">LOGOUT</button>
              ) : (
                <div className='signlogin'>
                  <Link to="/login" className="btn btn-success">LOGIN</Link>
                  <Link to="/signup" className="btn btn-success">SIGNUP</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="offcanvas offcanvas-start" tabIndex="-1" id="offcanvasExample" style={{ background: "#62bc6b" }} aria-labelledby="offcanvasExampleLabel">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title bevellier" id="offcanvasExampleLabel">
            <span><img src="COOKWITHME-LOGO.png" style={{ width: "30px", height: "30px", marginTop: "-10px" }} alt="logo" className="me-2" /></span>
            COOKWITHME
          </h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>

        <div className="offcanvas-body">
          <button
            className="btn btn-success w-50 mb-3 mx-5"
            onClick={handleNewChat}
            data-bs-dismiss="offcanvas"
          >
            New Chat
          </button>

          {error && (
            <div className="alert alert-warning">
              {error}
              <button onClick={fetchConversations} className="btn btn-sm btn-success ms-2">Retry</button>
            </div>
          )}

          {loading ? (
            <div className="text-center">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <p className="text-center me-4">No conversations yet</p>
          ) : (
            <div className="list-group">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  type="button"
                  className={`list-group-item bg-transparent border-1 border-success fw-bold list-group-item-action ranade ${currentConversation?.id === conv.id ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentConversation(conv);
                    fetchConversationMessages(conv.id);
                    if (window.innerWidth < 992) {
                      document.getElementById('offcanvasExample').classList.remove('show');
                      document.body.classList.remove('offcanvas-backdrop');
                    }
                  }}
                >
                  {conv.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="chatarea">
        {loading && conversationMessages.length === 0 ? (
          <div className="text-center">Loading messages...</div>
        ) : conversationMessages.length === 0 ? (
          <div className="text-center me-5 mt-5 nomsg">No messages yet. Start a conversation!</div>
        ) : (
          conversationMessages.map((msg, index) => (
            <div key={msg.id || `msg-${index}`} className="message-item">
              {msg.question && (
                <p className="you"><strong>You:</strong> {msg.question}</p>
              )}
              {msg.answer && (
                <p className="assistant"><strong>Assistant:</strong> {msg.answer}</p>
              )}
            </div>
          ))
        )}
      </div>
      <VoiceInput
        onQuestionChange={(text) => setHomeQuestion(text)}
        onAnswerChange={(text) => setHomeAnswer(text)}
        currentConversation={currentConversation}
        onSetCurrentConversation={(conv) => {
          setCurrentConversation(conv);
          try {
            localStorage.setItem('currentConversation', JSON.stringify(conv));
          } catch {}
          // Load messages for this conversation so the chat area updates
          fetchConversationMessages(conv.id);
        }}
        onRefreshConversations={fetchConversations}
        onRefreshMessages={(id) => fetchConversationMessages(id)}
      />

      <SearchBar
        ref={searchBarRef}
        onQuestionChange={(text) => setHomeQuestion(text)}
        onAnswerChange={(text) => setHomeAnswer(text)}
        currentConversation={currentConversation}
        onQuestionSubmit={handelQuestion}
      />
    </div>
  );
}

export default Home;
