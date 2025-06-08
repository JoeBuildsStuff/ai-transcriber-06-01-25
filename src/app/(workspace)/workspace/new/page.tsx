import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import UploadAudioProcess from "@/components/upload-audio-process";

export default function NewMeeting() {
  return (
    <div className="flex flex-1 items-center justify-center h-1/3">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>New Meeting</CardTitle>
          <CardDescription>
            Upload an audio file to transcribe and summarize a new meeting.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <UploadAudioProcess>
            <Button>Transcribe Audio</Button>
          </UploadAudioProcess>
        </CardContent>
      </Card>
    </div>
  );
}