"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar" // Ensure these paths are correct
import { Home, AudioLines } from "lucide-react"
import { SidebarLogo } from "./app-sidebar-logo"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils" // Ensure this path is correct
import { AuthButton } from "./auth-button"

// Menu items.
const items = [
  {
      name: "Home",
      path: "/workspace",
      icon: Home,
    },
    {
      name: "New",
      path: "/workspace/new",
      icon: AudioLines,
    },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      "w-full justify-start", // Default classes
                      pathname === item.path
                        ? "bg-muted/50 hover:bg-muted" // Active classes
                        : "hover:bg-muted" // Inactive classes
                    )}
                  >
                    <a href={item.path}>
                      <item.icon className="w-4 h-4 mr-2" />
                      <span>{item.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="">
        <AuthButton />
      </SidebarFooter>
    </Sidebar>
  )
}