import { AppSidebar } from "@/components/app-sidebar"; 
import { DynamicBreadcrumbs } from "@/components/dynamic-breadcrumbs";

import { SidebarTrigger } from "@/components/ui/sidebar"; 
import UploadAudioProcess from "@/components/upload-audio-process";
import { Button } from "@/components/ui/button";
import { AudioLines } from "lucide-react";

export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (
  <>    
        <AppSidebar /> 
        <main className="flex-1 overflow-auto px-4 grid grid-rows-[auto_1fr] "> 
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 flex-grow">
              <SidebarTrigger className="-ml-1" /> 
              <DynamicBreadcrumbs />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <UploadAudioProcess>
                <Button variant="outline" size="sm"><AudioLines className="mr-1 h-4 w-4" />New</Button>
              </UploadAudioProcess>
            </div>
          </header>
          <div className="mb-4 overflow-auto">
            {children}
          </div>
        </main>
        </>
);
}