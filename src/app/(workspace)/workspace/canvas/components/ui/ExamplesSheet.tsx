'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ChevronRight, Search} from 'lucide-react';
import { useCanvasStore, Node, Connection } from '../../lib/store/canvas-store';
import { Button } from '@/components/ui/button';
import { toast } from "sonner"

// Import example JSONs
import basicExample from '../../examples/basic.json';
import agenticOverviewExample from '../../examples/agentic-overview.json';
import chatBotExample from '../../examples/chat-bot.json';
import agentComponentsExample from '../../examples/agent-components.json';
import repeatProcessExample from '../../examples/repeat-process.json';

// Define interface for example data
interface ExampleData {
  nodes: Node[];
  connections: Connection[];
  version?: string;
  exportDate?: string;
}

const ExamplesSheet = () => {
  const { isExamplesSheetOpen, toggleExamplesSheet, pushToHistory } = useCanvasStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Function to load example into canvas
  const loadExample = (exampleData: ExampleData) => {
    try {
      // Save current state to history
      pushToHistory();
      
      // Update canvas with example data
      useCanvasStore.setState(state => {
        // Replace the nodes with example ones
        state.nodes = exampleData.nodes || [];
        
        // Replace connections if available
        state.connections = exampleData.connections || [];
        
        return state;
      });
      
      // Close the examples sheet
      toggleExamplesSheet();
      
      // Show success toast
      toast.success( "Example Loaded", {
        description: `Loaded example to the canvas.`,
      });
    } catch {
      toast.error( "Failed to Load Example", {
        description: "There was an error loading the example.",
      });
    }
  };

  // Filter examples based on search query
  const filteredExamples = [
    { name: "Basic", data: basicExample as ExampleData },
    { name: "Agentic Overview", data: agenticOverviewExample as ExampleData },
    { name: "Chatbot", data: chatBotExample as ExampleData },
    { name: "Agent Components", data: agentComponentsExample as ExampleData },
    { name: "Repeat Process", data: repeatProcessExample as ExampleData }
  ].filter(example => 
    example.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sheet open={isExamplesSheetOpen} onOpenChange={toggleExamplesSheet}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 overflow-y-auto">
        <SheetHeader className="p-6 border-b">
          <SheetTitle>Examples</SheetTitle>
          <SheetDescription className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search examples..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 p-6">
          {filteredExamples.map((example) => (
            <Button 
              key={example.name}
              variant="outline" 
              className="h-12 justify-between"
              onClick={() => loadExample(example.data)}
            >
              {example.name} <ChevronRight className="w-4 h-4" />
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExamplesSheet;