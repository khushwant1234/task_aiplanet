import React, { useState, useRef, useEffect } from "react";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [websckt, setWebsckt] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket connection effect
  useEffect(() => {
    if (!sessionId) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//localhost:8000/ws/${sessionId}`;
    console.log("Attempting to connect to:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket Connected");
      setMessages((prev) => [
        ...prev,
        {
          text: "PDFs loaded successfully! You can now ask questions.",
          sender: "system",
        },
      ]);
    };

    ws.onmessage = (event) => {
      try {
        if (event.data.includes("PDFs loaded successfully")) {
          return;
        }

        const sanitizedData = event.data.replace(/<[^>]*>?/gm, "");
        setMessages((prev) => [
          ...prev,
          {
            text: sanitizedData,
            sender: "ai",
          },
        ]);
        setIsAiResponding(false);
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
        setIsAiResponding(false);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: "Error connecting to chat server",
          sender: "system",
        },
      ]);
    };

    ws.onclose = () => {
      console.log("WebSocket Disconnected");
      setMessages((prev) => [
        ...prev,
        {
          text: "Disconnected from chat server",
          sender: "system",
        },
      ]);
    };

    setWebsckt(ws);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [sessionId]);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    setIsLoading(true);
    const formData = new FormData();

    for (let file of files) {
      formData.append("files", file);
    }

    try {
      const response = await fetch("http://localhost:8000/uploadfiles/", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("Upload response:", data);

      if (data.session_id) {
        setSessionId(data.session_id);
      } else {
        throw new Error("No session ID returned from server");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: `Error: ${error.message}`,
          sender: "system",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !websckt || websckt.readyState !== WebSocket.OPEN)
      return;

    setMessages((prev) => [
      ...prev,
      {
        text: input,
        sender: "user",
      },
    ]);

    setIsAiResponding(true);
    websckt.send(input);
    setInput("");
  };

  return (
    <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
      <div className="w-full h-full max-w-4xl bg-gray-800 shadow-2xl rounded-3xl overflow-hidden border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="bg-gray-700 px-6 py-4 flex justify-between items-center border-b border-gray-600">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.477 8-10 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.477-8 10-8s10 3.582 10 8z"
                ></path>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                AI Chat Assistant
              </h1>
              <p className="text-sm text-gray-400">Powered by ai-planet</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  sessionId ? "bg-green-500" : "bg-gray-500"
                }`}
              ></div>
              <span className="text-sm text-gray-400">
                {sessionId ? "Connected" : "Disconnected"}
              </span>
            </div>
            <input
              type="file"
              onChange={handleFileUpload}
              multiple
              accept=".pdf"
              className="hidden"
              id="file-upload"
              disabled={isLoading}
            />
            <label
              htmlFor="file-upload"
              className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl cursor-pointer 
                hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 
                flex items-center space-x-2 text-sm font-medium shadow-lg
                ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                ></path>
              </svg>
              <span>{isLoading ? "Processing..." : "Upload PDFs"}</span>
            </label>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-900">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Welcome to AI Chat Assistant
              </h3>
              <p className="text-gray-400 max-w-md">
                Upload your PDF documents to start an intelligent conversation.
                Ask questions and get instant answers from your documents.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="flex items-start space-x-3 max-w-xs lg:max-w-md">
                {message.sender !== "user" && (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                      message.sender === "ai"
                        ? "bg-gradient-to-br from-blue-500 to-purple-600"
                        : "bg-gray-700"
                    }`}
                  >
                    {message.sender === "ai" ? (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 112H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                    )}
                  </div>
                )}
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    message.sender === "user"
                      ? "bg-gray-700 text-white rounded-br-sm shadow-lg"
                      : message.sender === "ai"
                      ? "bg-white text-gray-900 rounded-bl-sm shadow-lg border border-gray-200"
                      : "bg-gray-800 text-white rounded-lg shadow-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
                {message.sender === "user" && (
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      ></path>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isAiResponding && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-xs lg:max-w-md">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg
                    className="w-4 h-4 text-white animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    ></path>
                  </svg>
                </div>
                <div className="p-4 rounded-2xl text-sm leading-relaxed bg-white text-gray-900 rounded-bl-sm shadow-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                    <span className="text-gray-500 text-xs">
                      AI is thinking...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={sendMessage}
          className="p-6 bg-gray-800 border-t border-gray-700"
        >
          <div className="flex space-x-4 items-end">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  sessionId
                    ? "Ask a question about your PDFs..."
                    : "Upload PDFs to start chatting"
                }
                className="w-full p-4 bg-gray-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 
                  placeholder-gray-400 transition-all duration-300 border border-gray-600 focus:border-blue-500"
                disabled={!sessionId || isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!sessionId || isLoading || !input.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-2xl hover:from-blue-600 hover:to-purple-700 
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 
                focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                ></path>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Chat;
