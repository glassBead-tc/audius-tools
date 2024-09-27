"use client";

import React, { useEffect, useRef, useState } from "react";
import { readStreamableValue } from "ai/rsc";
import { runAgent } from "./action";
import { StreamEvent } from "@langchain/core/tracers/log_stream";
import { runAudiusAgent } from "./audiusAgentServer";
import { routeQuery } from "./queryRouter";
import { Effect } from "effect";

export default function Page() {
  // State variables for input, data, and loading status
  const [input, setInput] = useState("");
  const [data, setData] = useState<StreamEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Ref for auto-scrolling
  const scrollRef = useRef<HTMLDivElement>(null);

  // Effect to auto-scroll to the bottom when new data is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data]);

  // Function to handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input) return;
    setIsLoading(true);
    setData([]);
    setInput("");

    // Use the query router to determine which agent to use
    const queryType = await routeQuery(input);

    let streamData;
    if (queryType === "audius") {
      // Run the Audius-specific agent
      const result = await runAudiusAgent(input);
      streamData = result;
    } else {
      // Run the general-purpose agent
      const result = await runAgent(input);
      streamData = result.streamData;
    }

    // Process the streaming data
    for await (const item of streamData().read()) {
      setData((prev) => [...prev, item as StreamEvent]);
    }
    setIsLoading(false);
  }

  return (
    <div className="mx-auto w-full max-w-4xl py-12 flex flex-col stretch gap-3">
      {/* Form for user input */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          placeholder="Ask a question about Audius or any general topic..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          type="submit"
          disabled={isLoading}
        >
          Submit
        </button>
      </form>
      
      {/* Display area for streamed responses */}
      <div
        ref={scrollRef}
        className="flex flex-col gap-2 px-2 h-[650px] overflow-y-auto"
      >
        {data.map((item, i) => (
          <div key={i} className="p-4 bg-[#25252f] rounded-lg">
            <strong>Event:</strong> <p className="text-sm">{item.event}</p>
            <br />
            <strong>Data:</strong>{" "}
            <p className="break-all text-sm">
              {JSON.stringify(item.data, null, 2)}
            </p>
          </div>
        ))}
      </div>
      
      {/* Display the user's question */}
      {data.length > 1 && (
        <div className="flex flex-col w-full gap-2">
          <strong className="text-center">Question</strong>
          <p className="break-words">{data[0].data.input.input}</p>
        </div>
      )}
      
      {/* Display the final result */}
      {!isLoading && data.length > 1 && (
        <>
          <hr />
          <div className="flex flex-col w-full gap-2">
            <strong className="text-center">Result</strong>
            <p className="break-words">{data[data.length - 1].data.output}</p>
          </div>
        </>
      )}
    </div>
  );
}
