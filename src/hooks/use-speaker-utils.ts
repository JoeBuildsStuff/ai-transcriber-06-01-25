import { MeetingSpeakerWithContact } from "@/types";

export function useSpeakerUtils(meetingSpeakers: MeetingSpeakerWithContact[]) {
    const getSpeakerColor = (speakerNumber: number) => {
        const colors = [
            "bg-blue-400/20 border-blue-600 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
            "bg-green-400/20 border-green-600 text-green-800 dark:bg-green-900 dark:text-green-100",
            "bg-yellow-400/20 border-yellow-600 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
            "bg-red-400/20 border-red-600 text-red-800 dark:bg-red-900 dark:text-red-100",
            "bg-purple-400/20 border-purple-600 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
            "bg-pink-400/20 border-pink-600 text-pink-800 dark:bg-pink-900 dark:text-pink-100",
            "bg-indigo-400/20 border-indigo-600 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100",
            "bg-teal-400/20 border-teal-600 text-teal-800 dark:bg-teal-900 dark:text-teal-100",
        ];
        return colors[speakerNumber % colors.length];
    };

    const getSpeakerDisplayName = (speakerNumber: number): string => {
        // Find the speaker in the meetingSpeakers array
        const speaker = meetingSpeakers.find(s => s.speaker_index === speakerNumber);
        
        if (!speaker) {
            return `Speaker ${speakerNumber}`;
        }

        // If speaker has associated contact, use contact data
        if (speaker.contact) {
            return `${speaker.contact.first_name} ${speaker.contact.last_name}`.trim() || 
                   speaker.contact.primary_email || 
                   `Speaker ${speakerNumber}`;
        }

        // If speaker has speaker_name, use that
        if (speaker.speaker_name && speaker.speaker_name !== `Speaker ${speakerNumber}`) {
            return speaker.speaker_name;
        }

        // Fall back to default
        return `Speaker ${speakerNumber}`;
    };

    return {
        getSpeakerColor,
        getSpeakerDisplayName,
    };
}
