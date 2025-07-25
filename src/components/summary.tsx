"use client";

import React from "react";
import { marked } from "marked";
import Tiptap from "./tiptap/tiptap";

interface SummaryProps {
  summary: Record<string, string>;
}

const formatTitle = (key: string): string => {
    if (!key) return "";
    return key
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const Summary: React.FC<SummaryProps> = ({ summary }) => {
  const sectionOrder = [
    'participants',
    'executive_summary',
    'discussion_outline',
    'decisions',
    'questions_asked',
    'action_items',
    'next_meeting_open_items',
  ];

  const sections = Object.entries(summary).filter(
    ([key, value]) => key !== 'title' && key !== 'date' && value && value.trim() !== ""
  );

  sections.sort(([keyA], [keyB]) => {
    const indexA = sectionOrder.indexOf(keyA);
    const indexB = sectionOrder.indexOf(keyB);

    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  if (sections.length === 0) {
    return <p className="text-center text-muted-foreground p-4">Waiting for summary...</p>;
  }

  return (
    <div className="h-full">
      <div className="space-y-6 max-w-2xl mx-auto">
        {sections.map(([key, value]) => {
          const htmlContent = marked(value) as string;
          return (
            <div key={key}>
              <h3 className="text-lg font-semibold mb-2 pb-1 border-b">{formatTitle(key)}</h3>
              <div className="prose prose-md max-w-none dark:prose-invert">
                <Tiptap
                  content={htmlContent}
                  showFixedMenu={false}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Summary;
