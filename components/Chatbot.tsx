'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Search, MapPin, Sparkles, Loader2, X } from 'lucide-react';
import Markdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

type ChatMode = 'pro' | 'search' | 'maps';

interface Message {
  role: 'user' | 'model';
  text: string;
  urls?: { uri: string; title: string }[];
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>('pro');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      let response;
      if (mode === 'pro') {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: userMsg,
          config: {
            systemInstruction: 'You are a helpful travel assistant. Answer questions clearly and concisely.',
          },
        });
      } else if (mode === 'search') {
        response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: userMsg,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
      } else if (mode === 'maps') {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userMsg,
          config: {
            tools: [{ googleMaps: {} }],
          },
        });
      }

      const text = response?.text || 'Sorry, I could not generate a response.';
      
      let urls: { uri: string; title: string }[] = [];
      const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) {
            urls.push({ uri: chunk.web.uri, title: chunk.web.title });
          } else if (chunk.maps?.uri && chunk.maps?.title) {
            urls.push({ uri: chunk.maps.uri, title: chunk.maps.title });
          }
        });
      }

      setMessages((prev) => [...prev, { role: 'model', text, urls }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'model', text: 'An error occurred while processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-slate-800 transition-colors z-50"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden">
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          AI Assistant
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex bg-slate-100 p-2 gap-2 border-b border-slate-200">
        <button
          onClick={() => setMode('pro')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors ${mode === 'pro' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Pro
        </button>
        <button
          onClick={() => setMode('search')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors ${mode === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Search className="w-3.5 h-3.5" /> Search
        </button>
        <button
          onClick={() => setMode('maps')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors ${mode === 'maps' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <MapPin className="w-3.5 h-3.5" /> Maps
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-8">
            Ask me anything about your travel plans!
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-900 rounded-bl-none'}`}>
              <div className="markdown-body prose prose-sm prose-slate max-w-none">
                <Markdown>{msg.text}</Markdown>
              </div>
              {msg.urls && msg.urls.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200/20 space-y-1.5">
                  <p className="text-xs font-medium opacity-70">Sources:</p>
                  {msg.urls.map((url, j) => (
                    <a key={j} href={url.uri} target="_blank" rel="noopener noreferrer" className="block text-xs text-indigo-300 hover:text-indigo-200 truncate">
                      {url.title || url.uri}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-none px-4 py-3">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm py-1.5"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:hover:text-indigo-600 transition-colors p-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
