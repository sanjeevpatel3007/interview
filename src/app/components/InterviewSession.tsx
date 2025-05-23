"use client";
import { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaSpinner } from 'react-icons/fa';
import { livekitService } from '../services/livekitService';
import { openaiService } from '../services/openaiService';
import { speechService } from '../services/speechService';
import Card from './Card';
import UIButton from './UIButton';

interface InterviewSessionProps {
  userInfo: {
    name: string;
    position: string;
    experience: string;
    additionalInfo: string;
  };
  onEndInterview: () => void;
}

export default function InterviewSession({ userInfo, onEndInterview }: InterviewSessionProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [botResponse, setBotResponse] = useState('');
  const [conversation, setConversation] = useState<{ speaker: 'user' | 'bot', text: string }[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const conversationContainerRef = useRef<HTMLDivElement>(null);
  
  // Set active message index to latest message
  useEffect(() => {
    if (conversation.length > 0) {
      setActiveMessageIndex(conversation.length - 1);
    }
  }, [conversation.length]);

  // Scroll to bottom of conversation when it updates
  useEffect(() => {
    if (conversationContainerRef.current) {
      conversationContainerRef.current.scrollTop = conversationContainerRef.current.scrollHeight;
    }
  }, [conversation]);
  
  // Initialize services and start interview
  useEffect(() => {
    const initializeInterview = async () => {
      // Initialize OpenAI with user information
      openaiService.resetConversation();
      openaiService.initializeWithUserInfo(userInfo);
      
      setIsLoading(true);
      
      try {
        // Generate initial question
        const initialQuestion = await openaiService.generateInitialQuestion();
        setBotResponse(initialQuestion);
        setConversation([{ speaker: 'bot', text: initialQuestion }]);
        
        // Speak the initial question
        if (speechService.isSynthesisSupported()) {
          setIsBotSpeaking(true);
          speechService.speak(initialQuestion, () => {
            setIsBotSpeaking(false);
          });
        }
      } catch (error) {
        console.error("Error initializing interview:", error);
        // Fallback initial question if something goes wrong
        const fallbackQuestion = `Hello ${userInfo.name}, thanks for joining this interview for the ${userInfo.position} position. Could you tell me about your background and experience?`;
        setBotResponse(fallbackQuestion);
        setConversation([{ speaker: 'bot', text: fallbackQuestion }]);
      } finally {
        setIsLoading(false);
      }
      
      // Connect to LiveKit (in a real implementation)
      // const connected = await livekitService.connect(userInfo.name, handleRemoteAudio);
      // setIsConnected(connected);
      
      // For demo purposes, we'll simulate being connected
      setIsConnected(true);
    };
    
    initializeInterview();
    
    // Cleanup on unmount
    return () => {
      speechService.stopListening();
      if (speechService.isSynthesisSupported()) {
        window.speechSynthesis.cancel();
      }
      // livekitService.disconnect();
    };
  }, [userInfo]);
  
  // Handle transcript from speech recognition
  const handleTranscript = async (text: string) => {
    if (!text.trim()) return; // Ignore empty responses
    
    setTranscript(text);
    
    // Add user response to conversation
    setConversation(prev => [...prev, { speaker: 'user', text }]);
    
    // Stop listening and process response
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    }
    
    // Show loading state while generating response
    setIsLoading(true);
    
    try {
      // Generate bot follow-up
      const nextQuestion = await openaiService.generateNextQuestion(text);
      setBotResponse(nextQuestion);
      setConversation(prev => [...prev, { speaker: 'bot', text: nextQuestion }]);
      
      // Speak the response
      if (speechService.isSynthesisSupported()) {
        setIsBotSpeaking(true);
        speechService.speak(nextQuestion, () => {
          setIsBotSpeaking(false);
        });
      }
    } catch (error) {
      console.error("Error generating response:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mock function for handling remote audio from LiveKit
  const handleRemoteAudio = (text: string) => {
    // In a real implementation, this would process audio from the bot
    console.log('Received remote audio transcript:', text);
  };
  
  // Toggle listening state
  const toggleListening = () => {
    if (isBotSpeaking || isLoading) {
      // Don't start listening if the bot is still speaking or loading
      return;
    }
    
    if (!isListening) {
      // Start listening
      if (speechService.isRecognitionSupported()) {
        const started = speechService.startListening(handleTranscript);
        setIsListening(started);
      } else {
        // Mock listening for browsers without speech recognition
        setIsListening(true);
        // Simulate receiving transcript after 3 seconds
        setTimeout(() => {
          const mockTranscript = "I have 5 years of experience working with React and Next.js. I've built several enterprise applications and led teams of frontend developers.";
          handleTranscript(mockTranscript);
        }, 3000);
      }
    } else {
      // Stop listening
      if (speechService.isRecognitionSupported()) {
        speechService.stopListening();
      }
      setIsListening(false);
    }
  };
  
  // Handle ending the interview
  const handleEndInterview = async () => {
    // Clean up resources
    speechService.stopListening();
    if (speechService.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    // await livekitService.disconnect();
    
    // Call the parent callback
    onEndInterview();
  };

  // Get current active message
  const activeMessage = conversation[activeMessageIndex] || null;
  
  return (
    <Card className="w-full max-w-2xl mx-auto" variant="glassmorphic">
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-semibold text-white">Interview in Progress</h2>
          <p className="text-sm text-gray-400">Position: {userInfo.position}</p>
        </div>
        <UIButton
          onClick={handleEndInterview}
          variant="secondary"
        >
          End Interview
        </UIButton>
      </div>
      
      <div className="space-y-4 mb-5">
        {/* Current active message display */}
        {activeMessage && (
          <div 
            className={`p-4 rounded-lg ${
              activeMessage.speaker === 'bot' 
                ? 'bg-gray-800/70 border-l-2 border-blue-500' 
                : 'bg-blue-600/20 border-l-2 border-green-400'
            }`}
          >
            <p className="text-sm font-medium mb-2 text-gray-400">
              {activeMessage.speaker === 'bot' ? 'Interviewer' : 'You'}
            </p>
            <p className="text-gray-200 text-lg">{activeMessage.text}</p>
          </div>
        )}
        
        {/* Conversation history indicator pills */}
        {conversation.length > 1 && (
          <div className="flex justify-center space-x-1 pt-2">
            {conversation.map((_, index) => (
              <button
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === activeMessageIndex 
                    ? 'w-4 bg-blue-500' 
                    : 'w-2 bg-gray-700'
                }`}
                onClick={() => setActiveMessageIndex(index)}
                aria-label={`View message ${index + 1}`}
              />
            ))}
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center py-3">
            <FaSpinner className="animate-spin text-blue-500 mr-2" />
            <span className="text-gray-400">Generating response...</span>
          </div>
        )}
      </div>
      
      <div className="bg-gray-900/80 rounded-lg p-4 border border-gray-800/50">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleListening}
            disabled={isBotSpeaking || isLoading}
            className={`p-4 rounded-full transition-all duration-200 ${
              isListening 
                ? 'bg-red-600 text-white' 
                : isBotSpeaking || isLoading
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isListening ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
          </button>
          
          <div className="flex-1 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-300 min-h-12">
            {isBotSpeaking ? (
              <p className="text-gray-400">Interviewer is speaking...</p>
            ) : isLoading ? (
              <p className="text-gray-400">Processing your response...</p>
            ) : isListening ? (
              <p className="text-gray-400">Listening...</p>
            ) : (
              <p className="text-gray-400">
                {transcript ? transcript : "Click the microphone to speak"}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
} 