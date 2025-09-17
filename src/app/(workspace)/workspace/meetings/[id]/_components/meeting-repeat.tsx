import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Repeat } from "lucide-react";
import { Label } from "@/components/ui/label";
import { InputNumber } from "@/components/ui/input-number";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateField, DateInput } from "@/components/ui/datefield-rac";
import { parseDate, CalendarDate } from "@internationalized/date";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { format, getDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

interface MeetingRepeatProps {
    meetingDate?: string | null;
}

export default function MeetingRepeat({ meetingDate }: MeetingRepeatProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState<string>("none");
    
    // Calculate default end date (1 year from meeting date or current date)
    const getDefaultEndDate = (): CalendarDate => {
        const baseDate = meetingDate ? new Date(meetingDate) : new Date();
        const oneYearLater = new Date(baseDate);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        return parseDate(oneYearLater.toISOString().split('T')[0]);
    };
    
    // Get current day of week for weekly toggle default
    const getCurrentDayOfWeek = (): string => {
        const baseDate = meetingDate ? new Date(meetingDate) : new Date();
        const dayMap = ['su', 'm', 't', 'w', 'th', 'f', 'sa'];
        return dayMap[baseDate.getDay()];
    };
    
    // Get current day of month for monthly repeat default
    const getCurrentDayOfMonth = (): number => {
        const baseDate = meetingDate ? new Date(meetingDate) : new Date();
        return baseDate.getDate();
    };
    
    // Get current weekday and ordinal for monthly repeat default
    const getCurrentWeekdayAndOrdinal = (): string => {
        const baseDate = meetingDate ? new Date(meetingDate) : new Date();
        
        // Get the day of the week name
        const dayName = format(baseDate, 'EEEE'); // e.g., "Wednesday"
        
        // Calculate which occurrence of this weekday it is in the month
        const monthStart = startOfMonth(baseDate);
        const monthEnd = endOfMonth(baseDate);
        const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
        
        // Filter days that match the same weekday
        const sameWeekdays = allDays.filter(day => getDay(day) === getDay(baseDate));
        
        // Find the index of our date in the array of same weekdays
        const occurrenceIndex = sameWeekdays.findIndex(day => isSameDay(day, baseDate));
        const occurrence = occurrenceIndex + 1; // Convert to 1-based
        
        // Convert to ordinal (1st, 2nd, 3rd, 4th)
        const ordinals = ['1st', '2nd', '3rd', '4th', '5th'];
        const ordinal = ordinals[occurrence - 1] || `${occurrence}th`;
        
        return `Monthly on the ${ordinal} ${dayName}`;
    };
    
    const [endDate, setEndDate] = useState(getDefaultEndDate());
    const [frequencyType, setFrequencyType] = useState<string>("day");
    const [selectedDays, setSelectedDays] = useState<string[]>([getCurrentDayOfWeek()]);
    const [monthlyOption, setMonthlyOption] = useState<string>("day");

    const handleValueChange = (value: string) => {
        if (value === "custom") {
            setIsDialogOpen(true);
            setSelectedValue("");
        } else {
            setSelectedValue(value);
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Select value={selectedValue} onValueChange={handleValueChange}>
                <SelectTrigger className="flex flex-row gap-2 items-center border-none shadow-none bg-input/30">
                    <Repeat className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5}/>
                    <SelectValue placeholder="Select repeat" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="weekly">Weekly on {format(meetingDate ? new Date(meetingDate) : new Date(), 'EEEE')}</SelectItem>
                    <SelectItem value="monthly">{getCurrentWeekdayAndOrdinal()}</SelectItem>
                    <SelectItem value="yearly">Yearly on {format(meetingDate ? new Date(meetingDate) : new Date(), 'MMMM d')}</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
            </Select>
            
            <DialogContent className="w-fit rounded-2xl">
                <DialogHeader>
                    <DialogTitle>Custom Recurrence</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-row items-center justify-between gap-8">
                        <Label htmlFor="frequency">Repeat every</Label>
                        <div className="flex flex-row gap-2 items-center">
                        <InputNumber placeholder="1" className="w-[5rem]"/>
                        <Select value={frequencyType} onValueChange={setFrequencyType}>
                            <SelectTrigger className="w-fit">
                                <SelectValue placeholder="day" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day">day</SelectItem>
                                <SelectItem value="week">week</SelectItem>
                                <SelectItem value="month">month</SelectItem>
                                <SelectItem value="year">year</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                    </div>

                    {/* optional for weekly and monthly repeat */}
                    {(frequencyType === "week" || frequencyType === "month") && (
                        <div className="flex flex-row items-center justify-between gap-2">
                            <Label htmlFor="days" className="w-[8rem]">Repeat on</Label>

                            {/* optional for weekly repeat */}
                            {frequencyType === "week" && (
                                <ToggleGroup 
                                    type="multiple" 
                                    value={selectedDays} 
                                    onValueChange={setSelectedDays} 
                                    className="w-full border border-border"
                                >
                                    <ToggleGroupItem value="su">S</ToggleGroupItem>
                                    <ToggleGroupItem value="m">M</ToggleGroupItem>
                                    <ToggleGroupItem value="t">T</ToggleGroupItem>
                                    <ToggleGroupItem value="w">W</ToggleGroupItem>
                                    <ToggleGroupItem value="th">T</ToggleGroupItem>
                                    <ToggleGroupItem value="f">F</ToggleGroupItem>
                                    <ToggleGroupItem value="sa">S</ToggleGroupItem>
                                </ToggleGroup>
                            )}

                            {/* optional for monthly repeat */}
                            {frequencyType === "month" && (
                                <Select value={monthlyOption} onValueChange={setMonthlyOption}>
                                    <SelectTrigger className="w-fit">
                                        <SelectValue placeholder={`Monthly on day ${getCurrentDayOfMonth()}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="day">Monthly on day {getCurrentDayOfMonth()}</SelectItem>
                                        <SelectItem value="weekday">{getCurrentWeekdayAndOrdinal()}</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                        <Label htmlFor="ends">Ends</Label>
                        <div>
                            <RadioGroup defaultValue="never" className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <RadioGroupItem value="never" id="r1" />
                                    <Label htmlFor="r1">Never</Label>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <RadioGroupItem value="on" id="r3" />
                                        <Label htmlFor="r3">On</Label>
                                    </div>
                                    <DateField value={endDate} onChange={(value) => value && setEndDate(value)}>
                                        <DateInput />
                                    </DateField>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <RadioGroupItem value="after" id="r2" />
                                        <Label htmlFor="r2">After</Label>
                                    </div>
                                    <InputNumber placeholder="12" className="w-[5rem]"/>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                    
                </div>
                <DialogFooter className="mt-4">
                    <DialogClose asChild>
                        <Button variant="default">Save</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}