// TODO: create an audio editor component that allows the user to edit the audio file.

import { Button } from "@/components/ui/button";
import { Play, RotateCcw, RotateCw } from "lucide-react";


export default function AudioEditor() {
return (  
        <div className="max-w-xl grid grid-cols-1 gap-8 mx-auto">

            {/* big waveform for current visible timescale */}
            <div className="w-full bg-secondary rounded-lg h-96">
                big waveform for current visible timescale
            </div>

            {/* complete waveform timeline */}
            <div className="w-full flex flex-col gap-2 px-[1rem]">
                <div className="w-full h-[3rem] bg-secondary rounded-lg">complete waveform timeline</div>

                {/* start and end time */}
                <div className="w-full flex flex-row justify-between items-center">
                    <div className="w-fit text-sm text-muted-foreground">0.00</div>
                    <div className="w-fit text-sm text-muted-foreground">1:20</div>
                </div>
            </div>

            {/* current time */}
            <div className="w-full items-center justify-center text-center">
                <span className="text-3xl font-bold">00:00.00</span>
            </div>

            {/* audio player buttons */}
            <div className="flex items-center justify-center gap-2">
                    <Button variant="ghost">
                        <RotateCcw className="size-5" />
                    </Button>
                    <Button variant="ghost">
                        <Play className="size-9" />
                    </Button>
                    <Button variant="ghost">
                        <RotateCw className="size-5" />
                    </Button>
                </div>

            {/* confirm buttons */}
            <div className="flex flex-row w-full justify-between items-center">
                
                {/* trim and delete buttons */}
                <div className="flex flex-row gap-2">
                    <Button variant="red">
                        Trim
                    </Button>
                    <Button variant="red">
                        Delete
                    </Button>
                </div>

                {/* apply button */}
                <Button variant="green">
                    Apply
                </Button>
            </div>

        </div>
    )
}