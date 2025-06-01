import { Bird } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
        <Bird className="w-10 h-10" />
        <h1 className="text-2xl font-bold">AI Transcriber</h1>
        <p className="text-sm text-muted-foreground">
          AI Transcriber is a tool that transcribes audio to text.
        </p>
      {children}
    </main>
  );
}
