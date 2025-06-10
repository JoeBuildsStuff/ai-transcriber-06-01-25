"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { AudioLines, Calendar, History, Loader2, Plus, Users } from "lucide-react"
import { SidebarLogo } from "./app-sidebar-logo"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { AuthButton } from "./auth-button"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import UploadAudioProcess from "./upload-audio-process"
import Link from "next/link"
import { createMeeting } from "@/actions/meetings"
import { toast } from "sonner"
import {
  useInfiniteQuery,
  SupabaseQueryHandler,
} from "@/hooks/use-infinite-query"

interface Meeting {
  id: string;
  original_file_name: string;
  created_at: string;
  title: string | null;
}

const orderByCreatedAt: SupabaseQueryHandler<'meetings'> = (query) => {
  return query.order('created_at', { ascending: false });
};

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false)
  const loadMoreRef = useRef(null);

  // Use infinite query for meetings
  const {
    data,
    isFetching,
    hasMore,
    fetchNextPage,
    isLoading,

  } = useInfiniteQuery({
    tableName: 'meetings',
    columns: 'id, original_file_name, created_at, title',
    pageSize: 15,
    trailingQuery: orderByCreatedAt,
  });

  useEffect(() => {
    setMeetings(data as Meeting[]);
  }, [data]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !isFetching) {
            fetchNextPage();
          }
        });
      },
      { 
        threshold: 0,
        rootMargin: '50px' // Smaller margin for sidebar
      }
    );

    const timeoutId = setTimeout(() => {
      if (loadMoreRef.current) {
        observer.observe(loadMoreRef.current);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [hasMore, isFetching, fetchNextPage]);

  const handleCreateMeeting = async () => {
    if (isCreatingMeeting) return
    setIsCreatingMeeting(true)

    const result = await createMeeting()

    if (result.error) {
      toast.error("Failed to create meeting", { description: result.error })
    } else if (result.meeting) {
      toast.success("New meeting created.")
      router.push(`/workspace/meetings/${result.meeting.id}`)
    }
    setIsCreatingMeeting(false)
  }

  const handleCreateContact = () => {
    console.log("Create contact clicked")
    toast.info("This feature is not yet implemented.")
  }

  const navigationItems = [
    {
      label: "Meetings",
      href: "/workspace/meetings",
      icon: Calendar,
      action: handleCreateMeeting,
      isActionLoading: isCreatingMeeting,
      actionAriaLabel: "Create new meeting",
    },
    {
      label: "Contacts",
      href: "/workspace/contacts",
      icon: Users,
      action: handleCreateContact,
      isActionLoading: false,
      actionAriaLabel: "Create new contact",
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <UploadAudioProcess> 
                  <SidebarMenuButton className="w-full justify-start">
                    <AudioLines className="w-4 h-4 mr-2 flex-none" />
                    <span>New Transcription</span>
                  </SidebarMenuButton>
                </UploadAudioProcess> 
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild
                    className={cn(
                      "w-full justify-start",
                      pathname.startsWith(item.href)
                        ? "bg-muted/50 hover:bg-muted font-semibold"
                        : "hover:bg-muted"
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-3.5 h-3.5 mr-2 flex-none" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.action && (
                    <SidebarMenuAction asChild>
                      <button
                        onClick={item.action}
                        disabled={item.isActionLoading}
                        className="disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
                        aria-label={item.actionAriaLabel}
                      >
                        {item.isActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    </SidebarMenuAction>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* Contacts */}
        <SidebarGroup>
          <SidebarGroupLabel><span>Recent Contacts</span></SidebarGroupLabel>
          <SidebarGroupAction title="Add Contact">
            <Plus /> <span className="sr-only">Add Contact</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <p className="text-xs text-muted-foreground px-3">No recent contacts found.</p>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Meetings with Infinite Scroll */}
        {user && (
          <SidebarGroup className="overflow-y-auto flex-grow">
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Recent Meetings</span>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {meetings.length > 0 ? (
                <SidebarMenu>
                  {meetings.map((meeting) => (
                    <SidebarMenuItem key={meeting.id}>
                      <SidebarMenuButton
                        asChild
                        title={`${meeting.title || meeting.original_file_name} (Uploaded: ${new Date(meeting.created_at).toLocaleDateString()})`}
                        className={cn(
                          "w-full justify-start text-sm",
                          pathname === `/workspace/meetings/${meeting.id}`
                            ? "bg-muted/50 hover:bg-muted font-semibold"
                            : "hover:bg-muted"
                        )}
                      >
                        <Link href={`/workspace/meetings/${meeting.id}`}>
                          <History className="w-3.5 h-3.5 mr-2 flex-none" />
                          <span className="truncate">{meeting.title || meeting.original_file_name || 'Untitled Meeting'}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  
                  {/* Load more trigger */}
                  <div ref={loadMoreRef} className="h-2" />
                  
                  {/* Loading indicator */}
                  {isFetching && (
                    <SidebarMenuItem>
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              ) : (
                !isLoading && <p className="text-xs text-muted-foreground px-3">No recent meetings found.</p>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <AuthButton />
      </SidebarFooter>
    </Sidebar>
  )
}