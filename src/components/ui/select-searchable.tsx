"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export interface SelectSearchableOption {
    id: string;
    label: string;
    searchValue?: string; // Optional custom search value
}

export interface SelectSearchableProps {
    /**
     * Currently selected value (option id)
     */
    value?: string;
    /**
     * Callback when selection changes
     */
    onValueChange?: (value: string) => void;
    /**
     * Available options to select from
     */
    options?: SelectSearchableOption[];
    /**
     * Placeholder text when no option is selected
     */
    placeholder?: string;
    /**
     * Placeholder text for search input
     */
    searchPlaceholder?: string;
    /**
     * Text shown when no options match search
     */
    emptyText?: string;
    /**
     * Custom CSS class name
     */
    className?: string;
    /**
     * Whether to show selected option as a badge
     */
    showBadge?: boolean;
    /**
     * Badge variant when showBadge is true
     */
    badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "blue" | "gray";
    /**
     * Whether to allow creating new options
     */
    allowCreate?: boolean;
    /**
     * Text for create button
     */
    createText?: string;
    /**
     * Callback when create button is clicked
     */
    onCreateClick?: () => void;
    /**
     * Whether the popover is open (controlled)
     */
    open?: boolean;
    /**
     * Callback when popover open state changes (controlled)
     */
    onOpenChange?: (open: boolean) => void;
}

export default function SelectSearchable({
    value = "",
    onValueChange,
    options = [],
    placeholder = "Select option...",
    searchPlaceholder = "Search options...",
    emptyText = "No option found.",
    className,
    showBadge = true,
    badgeVariant = "outline",
    allowCreate = false,
    createText = "Add Option",
    onCreateClick,
    open,
    onOpenChange
}: SelectSearchableProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    
    const isOpen = open !== undefined ? open : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;

    const selectedOption = options.find(option => option.id === value);

    const handlePopoverKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.tagName === "BUTTON") {
                // If a button is focused, click it
                (activeElement as HTMLButtonElement).click();
            } else {
                // Otherwise, close the popover
                setIsOpen(false);
            }
        }
    };

    const handleSelect = (optionId: string) => {
        const newValue = value === optionId ? "" : optionId;
        onValueChange?.(newValue);
        setIsOpen(false);
    };

    return (
        <div className={cn("w-full min-w-0", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger className={cn(
                    "w-full text-left hover:bg-secondary rounded-md py-2 px-2 truncate",
                    !value && "text-muted-foreground/80"
                )}>
                    {selectedOption ? (
                        showBadge ? (
                            <Badge variant={badgeVariant} className="text-sm">
                                {selectedOption.label}
                            </Badge>
                        ) : (
                            selectedOption.label
                        )
                    ) : (
                        placeholder
                    )}
                </PopoverTrigger>
                <PopoverContent 
                    className="p-0 rounded-xl" 
                    align="start"
                    onKeyDown={handlePopoverKeyDown}
                >
                    <Command className="w-full rounded-xl">
                        <CommandInput placeholder={searchPlaceholder} />
                        <ScrollArea className="h-60 pr-2">
                            <CommandList className="max-h-none overflow-hidden">
                                <CommandEmpty>{emptyText}</CommandEmpty>
                                <CommandGroup>
                                    {options.map((option) => (
                                        <CommandItem
                                            key={option.id}
                                            value={option.searchValue || option.label}
                                            onSelect={() => handleSelect(option.id)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === option.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {option.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </ScrollArea>
                        {allowCreate && onCreateClick && (
                            <>
                                <CommandSeparator />
                                <div className="p-1 h-9">
                                    <Button 
                                        variant="secondary" 
                                        size="sm"
                                        className="w-full h-full justify-start rounded-t-none text-muted-foreground"
                                        onClick={() => {
                                            setIsOpen(false);
                                            onCreateClick();
                                        }}
                                    >
                                        <Plus className="size-4 shrink-0" strokeWidth={1.5} />
                                        <span className="text-xs">{createText}</span>
                                    </Button>
                                </div>
                            </>
                        )}
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}