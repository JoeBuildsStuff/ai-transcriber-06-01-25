"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ModeToggleProps {
  variant?: "switch" | "dropdown" | "button";
}

export function ModeToggle({ variant = "dropdown" }: ModeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();

  if (variant === "switch") {
    const handleSwitchToggle = (checked: boolean) => {
      setTheme(checked ? "light" : "dark");
    };

    return (
      <div className="flex items-center space-x-2">
        <Switch
          id="theme-mode-switch"
          checked={resolvedTheme === "light"}
          onCheckedChange={handleSwitchToggle}
          aria-label="Toggle theme"
        />
        {resolvedTheme === "dark" ? (
          <Moon className="h-[1.2rem] w-[1.2rem]" /> // Show Moon icon if current theme is dark (to switch to light)
        ) : (
          <Sun className="h-[1.2rem] w-[1.2rem]" /> // Show Sun icon if current theme is light (to switch to dark)
        )}
        <span className="sr-only">Toggle theme</span>
      </div>
    );
  }

  if (variant === "button") {
    const handleButtonToggle = () => {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    };

    return (
      <Button variant="ghost" size="icon" onClick={handleButtonToggle}>
        {resolvedTheme === "dark" ? (
          <Moon className="h-[1.2rem] w-[1.2rem]" /> // Show Moon icon if current theme is dark (to switch to light)
        ) : (
          <Sun className="h-[1.2rem] w-[1.2rem]" /> // Show Sun icon if current theme is light (to switch to dark)
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  // Default to dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
