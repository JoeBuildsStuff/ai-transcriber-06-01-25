"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

interface SummaryProps {
  summary: string;
}

const Summary: React.FC<SummaryProps> = ({ summary }) => {
  return (
    <div className="mx-5 h-full">
      <div className="p-2 rounded ">
        {summary ? (
          <div className="prose prose-md max-w-none dark:prose-invert">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{summary}</ReactMarkdown>
          </div>
        ) : (
          <p>Waiting for summary...</p>
        )}
      </div>
    </div>
  );
};

export default Summary;
