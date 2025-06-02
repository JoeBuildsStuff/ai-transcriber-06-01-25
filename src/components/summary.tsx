"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Button } from "@/components/ui/button";
import { Copy, SquareCheckBig } from "lucide-react";
import { toast } from "sonner";
import { marked } from "marked";

interface SummaryProps {
  summary: string;
}

const Summary: React.FC<SummaryProps> = ({ summary }) => {
  const [copyButtonText, setCopyButtonText] = useState("Copy");
  const [copyIcon, setCopyIcon] = useState<"copy" | "check">("copy");

  const copyToClipboard = async () => {
    const htmlContent = await marked(summary);

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([summary], { type: "text/plain" }),
          "text/html": new Blob([htmlContent], { type: "text/html" }),
        }),
      ]);

      toast("Copied to clipboard", {
        description: "Summary copied to clipboard (formatted)",
      });

      setCopyButtonText("Copied");
      setCopyIcon("check");
      setTimeout(() => {
        setCopyButtonText("Copy");
        setCopyIcon("copy");
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Copy failed",{
        description: "Failed to copy summary to clipboard",
      });
    }
  };

  return (
    <div className="mx-5 h-full relative">
      <Button
        variant="ghost"
        className="absolute -top-10 right-0"
        onClick={copyToClipboard}
      >
        {copyIcon === "copy" ? (
          <Copy className="w-4 h-4 mr-2 flex-none" />
        ) : (
          <SquareCheckBig className="w-4 h-4 mr-2 flex-none" />
        )}
        {copyButtonText}
      </Button>
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
