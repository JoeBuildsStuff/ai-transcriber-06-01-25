

import { AppSidebar } from "@/components/app-sidebar"; 
import { DynamicBreadcrumbs } from "@/components/dynamic-breadcrumbs";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar"; 


export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (
  <>    
        <AppSidebar /> 
        <main className="flex-1 overflow-auto px-4"> 
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 flex-grow">
              <SidebarTrigger className="-ml-1" /> 
              <DynamicBreadcrumbs />
            </div>
            <div className="ml-auto border-none">
              <div className="flex items-center gap-2">
                <ModeToggle />
              </div>
            </div>
          </header>
          <div className="mb-10">
            {children}
          </div>
        </main>
        </>
);
}