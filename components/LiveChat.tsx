'use client';

import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { AudioStreamer, AudioPlayer } from '../utils/audio';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export interface UIState {
  type: 'idle' | 'properties' | 'flights' | 'itinerary' | 'image' | 'video';
  data?: any;
}

export function LiveChat({ onUIUpdate }: { onUIUpdate: (state: UIState) => void }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const sessionRef = useRef<any>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const showPropertiesTool: FunctionDeclaration = {
    name: 'showProperties',
    description: 'Show a list of properties, hotels, or rentals to the user based on their preferences.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: 'The city or location' },
        properties: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              pricePerNight: { type: Type.NUMBER },
              rating: { type: Type.NUMBER },
              imageUrl: { type: Type.STRING, description: 'A descriptive keyword for the image (e.g., "luxury hotel pool")' },
              description: { type: Type.STRING },
            },
          },
        },
      },
      required: ['location', 'properties'],
    },
  };

  const showFlightsTool: FunctionDeclaration = {
    name: 'showFlights',
    description: 'Show flight options to the user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        origin: { type: Type.STRING },
        destination: { type: Type.STRING },
        flights: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              airline: { type: Type.STRING },
              price: { type: Type.NUMBER },
              departureTime: { type: Type.STRING },
              arrivalTime: { type: Type.STRING },
              duration: { type: Type.STRING },
            },
          },
        },
      },
      required: ['origin', 'destination', 'flights'],
    },
  };

  const showItineraryTool: FunctionDeclaration = {
    name: 'showItinerary',
    description: 'Show a day-by-day trip itinerary or planner.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        destination: { type: Type.STRING },
        days: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dayNumber: { type: Type.NUMBER },
              activities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    description: { type: Type.STRING },
                    location: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      },
      required: ['destination', 'days'],
    },
  };

  const generateImageTool: FunctionDeclaration = {
    name: 'generateImage',
    description: 'Generate an image of a destination or activity to show the user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'A detailed prompt to generate the image' },
      },
      required: ['prompt'],
    },
  };

  const generateVideoTool: FunctionDeclaration = {
    name: 'generateVideo',
    description: 'Generate a video of a destination or activity to show the user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'A detailed prompt to generate the video' },
      },
      required: ['prompt'],
    },
  };

  const connect = async () => {
    if (isConnected || isConnecting) return;
    setIsConnecting(true);

    try {
      streamerRef.current = new AudioStreamer();
      playerRef.current = new AudioPlayer();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are an expert AI travel agent and planner. You help users plan trips, find hotels, book flights, and create itineraries. You have access to tools to show UI components to the user. When a user asks for hotels, flights, itineraries, images, or videos, you MUST call the corresponding tool to show them the options visually on the screen, while also explaining them briefly via voice. Be conversational, friendly, and helpful.',
          tools: [
            { functionDeclarations: [showPropertiesTool, showFlightsTool, showItineraryTool, generateImageTool, generateVideoTool] }
          ],
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            streamerRef.current?.start((base64Data) => {
              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' },
                });
              });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              playerRef.current?.play(base64Audio);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              playerRef.current?.stop();
            }

            // Handle tool calls
            const toolCall = message.toolCall;
            if (toolCall) {
              for (const call of toolCall.functionCalls || []) {
                const args = call.args || {};
                if (call.name === 'showProperties') {
                  onUIUpdate({ type: 'properties', data: args });
                } else if (call.name === 'showFlights') {
                  onUIUpdate({ type: 'flights', data: args });
                } else if (call.name === 'showItinerary') {
                  onUIUpdate({ type: 'itinerary', data: args });
                } else if (call.name === 'generateImage') {
                  onUIUpdate({ type: 'image', data: { prompt: args.prompt, loading: true } });
                  // Trigger image generation in the background
                  generateImage(args.prompt as string).then((imageUrl) => {
                    onUIUpdate({ type: 'image', data: { prompt: args.prompt, imageUrl, loading: false } });
                  });
                } else if (call.name === 'generateVideo') {
                  onUIUpdate({ type: 'video', data: { prompt: args.prompt, loading: true } });
                  // Trigger video generation in the background
                  generateVideo(args.prompt as string).then((videoUrl) => {
                    onUIUpdate({ type: 'video', data: { prompt: args.prompt, videoUrl, loading: false } });
                  });
                }

                // Send tool response back
                sessionPromise.then((session) => {
                  session.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: { result: 'UI updated successfully' },
                      },
                    ],
                  });
                });
              }
            }
          },
          onclose: () => {
            setIsConnected(false);
            setIsConnecting(false);
            streamerRef.current?.stop();
            playerRef.current?.stop();
          },
          onerror: (error) => {
            console.error('Live API Error:', error);
            setIsConnected(false);
            setIsConnecting(false);
            streamerRef.current?.stop();
            playerRef.current?.stop();
          },
        },
      });

      sessionRef.current = sessionPromise;
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
    }
    setIsConnected(false);
    streamerRef.current?.stop();
    playerRef.current?.stop();
  };

  const generateImage = async (prompt: string) => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '16:9',
            imageSize: '1K',
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (error) {
      console.error('Image generation error:', error);
    }
    return null;
  };

  const generateVideo = async (prompt: string) => {
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': apiKey || '',
          },
        });
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error('Video generation error:', error);
    }
    return null;
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <button
        onClick={isConnected ? disconnect : connect}
        disabled={isConnecting}
        className={`flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300 ${
          isConnected
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
      >
        {isConnecting ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : isConnected ? (
          <MicOff className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </button>
      {isConnected && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-3 py-1.5 rounded-full">
          Listening...
        </div>
      )}
    </div>
  );
}
