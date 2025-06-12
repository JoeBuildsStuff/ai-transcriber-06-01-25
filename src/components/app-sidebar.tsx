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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { AudioLines, Calendar, ChevronRight, Loader2, Plus, Users } from "lucide-react"
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
import { format, parseISO, formatDistanceToNow } from "date-fns"
import {
  useInfiniteQuery,
  SupabaseQueryHandler,
} from "@/hooks/use-infinite-query"
import { Badge } from "./ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

interface Meeting {
  id: string;
  original_file_name: string;
  created_at: string;
  title: string | null;
  meeting_at: string | null;
  meeting_reviewed: boolean | null;
}

const orderByMeetingAt: SupabaseQueryHandler<'meetings'> = (query) => {
  return query.order('meeting_at', { ascending: false });
};

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false)
  const loadMoreRef = useRef(null);

  const {
    data,
    isFetching,
    hasMore,
    fetchNextPage,
    isLoading,
  } = useInfiniteQuery({
    tableName: 'meetings',
    columns: 'id, original_file_name, created_at, title, meeting_at, meeting_reviewed',
    pageSize: 15,
    trailingQuery: orderByMeetingAt,
  });

  useEffect(() => {
    setMeetings(data as Meeting[]);
  }, [data]);

  // Function to group meetings by date
  const groupMeetingsByDate = (meetings: Meeting[]) => {
    return meetings.reduce((groups: { [key: string]: Meeting[] }, meeting) => {
      if (meeting.meeting_at) {
        const date = format(parseISO(meeting.meeting_at), 'yyyy-MM-dd');
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(meeting);
      } else {
        const date = format(parseISO(meeting.created_at), 'yyyy-MM-dd');
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(meeting);
      }
      return groups;
    }, {});
  };

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
        rootMargin: '50px'
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

  // Group meetings by date and convert to collapsible format
  const groupedMeetings = groupMeetingsByDate(meetings);
  const meetingsByDate = Object.entries(groupedMeetings).map(([date, dateMeetings]) => {
    // Check if any meeting from this date is currently active
    const isActive = dateMeetings.some(meeting => pathname === `/workspace/meetings/${meeting.id}`);
    
    return {
      title: format(parseISO(date), 'EEE, MMM d'),
      subtitle: formatDistanceToNow(new Date(date), { addSuffix: true }),
      isActive,
      items: dateMeetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title || meeting.original_file_name || 'Untitled Meeting',
        url: `/workspace/meetings/${meeting.id}`,
        time: meeting.meeting_at ? format(parseISO(meeting.meeting_at), 'p') : null,
        isActive: pathname === `/workspace/meetings/${meeting.id}`,
        isReviewed: meeting.meeting_reviewed || false, // Add this line
      }))
    };
  });

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
          <SidebarGroupLabel><span>Contacts</span></SidebarGroupLabel>
          <SidebarGroupAction title="Add Contact">
            <Plus /> <span className="sr-only">Add Contact</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <p className="text-xs text-muted-foreground px-3">No contacts found.</p>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Meetings with Collapsible Groups */}
        {user && (
          <SidebarGroup className="overflow-y-auto flex-grow">
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Meetings</span>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {meetingsByDate.length > 0 ? (
                <SidebarMenu>
                  {meetingsByDate.map((dateGroup) => (
                    <Collapsible
                      key={dateGroup.title}
                      asChild
                      defaultOpen={dateGroup.isActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-sm font-medium whitespace-nowrap">{dateGroup.title}</span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap truncate">{dateGroup.subtitle}</span>
                            </div>
                            <ChevronRight className="ml-auto flex-shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                          {dateGroup.items.map((meeting) => (
                            <SidebarMenuSubItem key={meeting.id}>
                              <SidebarMenuSubButton 
                                asChild
                                className={cn(
                                  meeting.isActive && "bg-muted font-semibold"
                                )}
                              >
                                <Link href={meeting.url}>
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {meeting.time && (
                                    <div className="relative">
                                      <Badge variant="outline" className="">
                                        {meeting.time}
                                      </Badge>
                                      {!meeting.isReviewed && (
                                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
                                      )}
                                    </div>
                                  )}
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="truncate text-sm flex-1">
                                            {meeting.title}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" showArrow={true} className="ml-2">
                                          <p>{meeting.title}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
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
                !isLoading && <p className="text-xs text-muted-foreground px-3">No meetings found.</p>
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