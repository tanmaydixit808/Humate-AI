// app/HomeClient.tsx
"use client";

import "@livekit/components-styles";
import { AnimatePresence, motion } from "framer-motion";
import Image from 'next/image';
import { PasswordPopup } from "./PasswordPopup";
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  AgentState,
  DisconnectButton,
} from "@livekit/components-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { MediaDeviceFailure } from "livekit-client";
import type { ConnectionDetails } from "./api/connection-details/route";
import { useKrispNoiseFilter } from "@livekit/components-react/krisp";
import { VideoAvatar } from './VideoAvatar';

export function HomeClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionDetails, updateConnectionDetails] = useState<ConnectionDetails | undefined>(undefined);
  const [agentState, setAgentState] = useState<AgentState>("disconnected");
  const [showVideoAvatar, setShowVideoAvatar] = useState(false);
  const refreshTokenInterval = useRef<NodeJS.Timeout | null>(null);

  const mainClassName = `h-[calc(100%-64px)] flex items-center justify-center`;

  const wrapperClassName = `h-full transition-colors duration-300 ${
    showVideoAvatar ? 'bg-white' : 'bg-black'
  }`;

  const headerClassName = `w-full flex justify-between items-center px-4 py-3 border-b transition-colors duration-300 ${
    showVideoAvatar 
      ? 'border-gray-200 bg-white' 
      : 'border-gray-800 bg-black'
  }`;

  // Update SVG colors based on theme
  const iconColor = showVideoAvatar ? '#7b7b7b' : '#545454';

  const fetchConnectionDetails = useCallback(async (roomName?: string, participantIdentity?: string) => {
    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details",
      window.location.origin
    );
    if (roomName) url.searchParams.append('roomName', roomName);
    if (participantIdentity) url.searchParams.append('participantIdentity', participantIdentity);

    const response = await fetch(url.toString());
    const connectionDetailsData = await response.json();
    updateConnectionDetails(connectionDetailsData);
    return connectionDetailsData;
  }, []);

  const onConnectButtonClicked = useCallback(async () => {
    const details = await fetchConnectionDetails();
    startTokenRefresh(details.roomName, details.participantName);
  }, [fetchConnectionDetails]);

  const startTokenRefresh = useCallback((roomName: string, participantIdentity: string) => {
    if (refreshTokenInterval.current) {
      clearInterval(refreshTokenInterval.current);
    }
    refreshTokenInterval.current = setInterval(async () => {
      await fetchConnectionDetails(roomName, participantIdentity);
    }, 4 * 60 * 1000);
  }, [fetchConnectionDetails]);

  const onDisconnect = useCallback(() => {
    updateConnectionDetails(undefined);
    setAgentState("disconnected");
    if (refreshTokenInterval.current) {
      clearInterval(refreshTokenInterval.current);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  // Add this useEffect to check authentication status on component mount
  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // If not authenticated, show the password popup
  if (!isAuthenticated) {
    return <PasswordPopup onCorrectPassword={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className={wrapperClassName}>
      <header className={headerClassName}>
        <div className="flex items-center relative h-[30px] w-[75px]">
          <Image 
            src="/logo.png" 
            alt="Logo" 
            width={75}
            height={30}
            priority
            className={`absolute transition-opacity duration-300 ${
              showVideoAvatar ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <Image 
            src="/logo-dark.png" 
            alt="Logo" 
            width={75}
            height={30}
            priority
            className={`absolute transition-opacity duration-300 ${
              showVideoAvatar ? 'opacity-0' : 'opacity-100'
            }`}
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowVideoAvatar(!showVideoAvatar)}
            className="p-0 transition duration-200"
          >
            {showVideoAvatar ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 14.25C13.2426 14.25 14.25 13.2426 14.25 12C14.25 10.7574 13.2426 9.75 12 9.75C10.7574 9.75 9.75 10.7574 9.75 12C9.75 13.2426 10.7574 14.25 12 14.25Z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.25 12C20.25 16.5563 16.5563 20.25 12 20.25C7.44365 20.25 3.75 16.5563 3.75 12C3.75 7.44365 7.44365 3.75 12 3.75C16.5563 3.75 20.25 7.44365 20.25 12Z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 10L19.5528 7.72361C20.2177 7.39116 21 7.87465 21 8.61803V15.382C21 16.1253 20.2177 16.6088 19.5528 16.2764L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="p-2 transition duration-200"
          >
            <svg fill="none" height="20" viewBox="0 0 20 23" width="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 16L21 12M21 12L17 8M21 12L7 12M13 16V17C13 18.6569 11.6569 20 10 20H6C4.34315 20 3 18.6569 3 17V7C3 5.34315 4.34315 4 6 4H10C11.6569 4 13 5.34315 13 7V8" stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </header>

      <main data-lk-theme="default" className={mainClassName}>
        <LiveKitRoom
          token={connectionDetails?.participantToken}
          serverUrl={connectionDetails?.serverUrl}
          connect={connectionDetails !== undefined}
          audio={true}
          video={false}
          onMediaDeviceFailure={onDeviceFailure}
          onDisconnected={onDisconnect}
          className="w-full h-full flex items-center justify-center"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <SimpleVoiceAssistant onStateChange={setAgentState} showVideoAvatar={showVideoAvatar} />
            <ControlBar onConnectButtonClicked={onConnectButtonClicked} agentState={agentState} />
            <RoomAudioRenderer />
            <NoAgentNotification state={agentState} />
          </div>
        </LiveKitRoom>
      </main>
    </div>
  );
}

function SimpleVoiceAssistant(props: {
  onStateChange: (state: AgentState) => void;
  showVideoAvatar: boolean;
}) {
  const { state, audioTrack } = useVoiceAssistant();

  useEffect(() => {
    props.onStateChange(state);
  }, [props, state]);

  return (
    <div className="flex items-center justify-center w-full">
      {props.showVideoAvatar ? (
        <VideoAvatar agentState={state} />
      ) : (
        <div className="h-[350px] max-w-[90vw] mx-auto">
          <BarVisualizer
            state={state}
            barCount={5}
            trackRef={audioTrack}
            className="agent-visualizer"
            options={{ minHeight: 24 }}
          />
        </div>
      )}
    </div>
  );
}

function ControlBar(props: { onConnectButtonClicked: () => void; agentState: AgentState; }) {
  const krisp = useKrispNoiseFilter();
  useEffect(() => {
    krisp.setNoiseFilterEnabled(true);
  }, []);

  return (
    <div className="controls-container">
      <AnimatePresence mode="wait">
        {props.agentState === "disconnected" ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="start-talking-button"
            onClick={() => props.onConnectButtonClicked()}
          >
            Start Talking
          </motion.button>
        ) : props.agentState !== "connecting" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            <VoiceAssistantControlBar controls={{ leave: false }} />
            <DisconnectButton>
              <CloseIcon />
            </DisconnectButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.33398 3.33334L12.6673 12.6667M12.6673 3.33334L3.33398 12.6667" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

function NoAgentNotification(props: { state: AgentState }) {
  const timeToWaitMs = 10_000;
  const timeoutRef = useRef<number | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const agentHasConnected = useRef(false);

  if (["listening", "thinking", "speaking"].includes(props.state) && agentHasConnected.current == false) {
    agentHasConnected.current = true;
  }

  useEffect(() => {
    if (props.state === "connecting") {
      timeoutRef.current = window.setTimeout(() => {
        if (props.state === "connecting" && agentHasConnected.current === false) {
          setShowNotification(true);
        }
      }, timeToWaitMs);
    } else {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      setShowNotification(false);
    }

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [props.state]);

  return (
    <>
      {showNotification ? (
        <div className="fixed text-sm left-1/2 max-w-[90vw] -translate-x-1/2 flex top-6 items-center gap-4 bg-[#1F1F1F] px-4 py-3 rounded-lg">
          <div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M9.85068 3.63564C10.8197 2.00589 13.1793 2.00589 14.1484 3.63564L21.6323 16.2223C22.6232 17.8888 21.4223 20 19.4835 20H4.51555C2.57676 20 1.37584 17.8888 2.36671 16.2223L9.85068 3.63564ZM12 8.5C12.2761 8.5 12.5 8.72386 12.5 9V13.5C12.5 13.7761 12.2761 14 12 14C11.7239 14 11.5 13.7761 11.5 13.5V9C11.5 8.72386 11.7239 8.5 12 8.5ZM12.75 16C12.75 16.4142 12.4142 16.75 12 16.75C11.5858 16.75 11.25 16.4142 11.25 16C11.25 15.5858 11.5858 15.25 12 15.25C12.4142 15.25 12.75 15.5858 12.75 16Z" fill="#666666" />
            </svg>
          </div>
          <p className="text-pretty w-max">
            It's quiet... too quiet. Is your agent lost? Ensure your agent is properly configured and running on your machine.
          </p>
          <a href="https://docs.livekit.io/agents/quickstarts/s2s/" target="_blank" className="underline whitespace-nowrap">
            View guide
          </a>
          <button onClick={() => setShowNotification(false)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.16602 3.16666L12.8327 12.8333M12.8327 3.16666L3.16602 12.8333" stroke="#999999" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>
        </div>
      ) : null}
    </>
  );
}

function onDeviceFailure(error?: MediaDeviceFailure) {
  console.error(error);
  alert(
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}