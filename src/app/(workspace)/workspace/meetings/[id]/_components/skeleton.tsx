import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Map, Repeat, Tags, Type, Users } from "lucide-react";
import { DeleteButton } from "@/components/ui/delete-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

    export default function MeetingIdSkeleton() {
    return (
        <div className="flex flex-col gap-3 p-1 h-[calc(100vh-5rem)]">
        <div className="flex flex-row gap-2 items-center flex-1">
            <Type className="size-4 shrink-0 text-muted-foreground" />
            <Skeleton className="w-full h-9" />
            <DeleteButton 
                onDelete={async () => {
                    return;
                }}
                redirectTo="/workspace/meetings"
                successMessage="Meeting deleted successfully!"
                errorMessage="Failed to delete meeting"
                confirmText="Confirm Delete"
                tooltipText="Delete meeting"
                size="icon"
            />
        </div>

        <div className="flex flex-row gap-2 items-center flex-1">
            <Users className="size-4 shrink-0 text-muted-foreground" />
            <Skeleton className="w-full h-9" />
        </div>

        {/* Date */}
        <div className="flex flex-row gap-2 items-center">
            <div className="flex flex-row gap-2 items-center font-extralight border-none">
                <Calendar className="size-4 shrink-0 text-muted-foreground" />
                <Skeleton className="w-25 h-9" />
            </div>
            <div className="flex flex-row gap-2 items-center font-extralight">
                <Clock className="size-4 shrink-0 text-muted-foreground" />
                <Skeleton className="w-25 h-9" />
            </div>
            <div className="flex flex-row gap-2 items-center font-extralight">
                <Repeat className="size-4 shrink-0 text-muted-foreground" />
                <Skeleton className="w-25 h-9" />
            </div>
        </div>

        <div className="flex flex-row gap-2 items-center flex-1">   
            <Map className="size-4 shrink-0 text-muted-foreground" />
            <Skeleton className="w-full h-9" />
        </div>

        <div className="flex flex-row gap-2 items-center flex-1">   
            <Tags className="size-4 shrink-0 text-muted-foreground" />
            <Skeleton className="w-full h-9" />
        </div>


        <Skeleton className="w-full h-30 rounded-xl" />

        <Tabs defaultValue="transcript" className="w-full h-full overflow-y-auto">
            <TabsList>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="outline">Outline</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
                <TabsContent value="transcript">
                    <Card className="flex w-full h-full p-1 gap-2">
                        <Skeleton className="sticky top-0 z-10 flex flex-row gap-2 items-center bg-card/80 backdrop-blur-lg rounded-lg p-3 font-extralight">
                            <span className="text-sm font-extralight">Speakers:</span>
                            <Skeleton className="w-20 h-6" />
                            <Skeleton className="w-20 h-6" />
                            <Skeleton className="w-20 h-6" />
                        </Skeleton>

                        {Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="mb-1 p-2 gap-2 flex flex-col">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="w-20 h-6" />
                                    <Skeleton className="w-10 h-4" />
                                </div>
                                <div className="flex flex-col gap-1 ml-4">
                                    <Skeleton className="w-full h-6" />
                                    <Skeleton className="w-1/3 h-6" />
                                </div>
                            </div>
                        ))}
                    </Card>
                </TabsContent>
                <TabsContent value="outline"><Card className="flex w-full h-full"></Card></TabsContent>
                <TabsContent value="notes"><Card className="flex w-full h-full"></Card></TabsContent>
            </Tabs> 
        </div>
    )
}