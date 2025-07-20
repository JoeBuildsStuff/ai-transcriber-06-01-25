'use client'

import { AppSidebar } from "@/components/app-sidebar"; 
import { DynamicBreadcrumbs } from "@/components/dynamic-breadcrumbs";
import { ChatProvider, ChatBubble, ChatPanel } from "@/components/chat";
import { useChatStore } from "@/lib/chat/chat-store";
import { cn } from "@/lib/utils";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"; 
import UploadAudioProcess from "@/components/upload-audio-process";
import { Button } from "@/components/ui/button";
import { AudioLines } from "lucide-react";
import ReportIssueButton from "@/components/report-issue-button";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isMaximized } = useChatStore()

  return (
    <SidebarProvider> 
      <AppSidebar /> 
      <main className={cn(
        "flex-1 overflow-auto px-4 grid grid-rows-[auto_1fr] transition-all duration-300 ease-in-out",
        // Adjust right margin when chat is maximized
        isMaximized && "mr-96"
      )}> 
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 flex-grow">
            <SidebarTrigger className="-ml-1" /> 
            <DynamicBreadcrumbs />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ReportIssueButton />
            <UploadAudioProcess>
              <Button variant="outline" size="sm">
                <AudioLines className="h-4 w-4 shrink-0" />
                <span className="hidden sm:block">New</span>
              </Button>
            </UploadAudioProcess>
          </div>
        </header>
        <div className="mb-4 overflow-auto">
          {children}
        </div>
      </main>
      {/* Chat Components */}
      <ChatBubble />
      <ChatPanel />
    </SidebarProvider>
  )
}

export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (  
    <ChatProvider>
      <LayoutContent>
        {children}
      </LayoutContent>
    </ChatProvider>
  );
}