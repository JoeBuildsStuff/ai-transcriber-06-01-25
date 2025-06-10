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
} from "@/components/ui/sidebar" // Ensure these paths are correct
import { AudioLines, Calendar, History, Loader2, Plus, Users } from "lucide-react"
import { SidebarLogo } from "./app-sidebar-logo"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils" // Ensure this path is correct
import { AuthButton } from "./auth-button"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import UploadAudioProcess from "./upload-audio-process"
import Link from "next/link"
import { createMeeting } from "@/actions/meetings"
import { toast } from "sonner"


interface Meeting {
  id: string;
  original_file_name: string;
  created_at: string;
  title: string | null;
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false)

  const fetchMeetings = useCallback(async () => {
    if (user) {
      setIsLoadingMeetings(true);
      try {
        const res = await fetch('/api/meetings');
        if (!res.ok) {
          throw new Error('Failed to fetch meetings');
        }
        const data = await res.json();
        setMeetings(data as Meeting[]);
      } catch (error) {
        console.error("Error fetching meetings for sidebar:", error);
        // Potentially set an error state here to display in the UI
      } finally {
        setIsLoadingMeetings(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchMeetings();
  }, [user, fetchMeetings]); // fetchMeetings is stable due to useCallback, user is the primary trigger

  // Re-fetch meetings if user navigates to the main workspace page, to ensure list is fresh after potential deletions
  useEffect(() => {
    if (pathname === '/workspace') {
      fetchMeetings();
    }
  }, [pathname, fetchMeetings]);

  const handleCreateMeeting = async () => {
    if (isCreatingMeeting) return
    setIsCreatingMeeting(true)

    const result = await createMeeting()

    if (result.error) {
      toast.error("Failed to create meeting", { description: result.error })
    } else if (result.meeting) {
      toast.success("New meeting created.")
      router.push(`/workspace/meetings/${result.meeting.id}`)
      fetchMeetings()
    }
    setIsCreatingMeeting(false)
  }

  const handleCreateContact = () => {
    // Placeholder for when you want to add a contact from the sidebar
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
      isActionLoading: false, // Placeholder
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
                {/* opens the upload audio process modal */}
                <UploadAudioProcess> 
                  <SidebarMenuButton
                    className="w-full justify-start">
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

        {/* Meetings */}
        {user && (
          <SidebarGroup className="overflow-y-auto flex-grow">
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Recent Meetings</span>
              {isLoadingMeetings && <Loader2 className="w-4 h-4 animate-spin" />}
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
                </SidebarMenu>
              ) : (
                !isLoadingMeetings && <p className="text-xs text-muted-foreground px-3">No recent meetings found.</p>
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