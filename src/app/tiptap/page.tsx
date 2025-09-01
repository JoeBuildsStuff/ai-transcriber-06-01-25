import Tiptap from "@/components/tiptap/tiptap";

export default function TiptapPage() {
    return (
        <div className="flex flex-col gap-3 p-1 h-screen">
            <div className="flex-shrink-0">the tiptap component should remain below the header</div>
            <div className="flex-1 min-h-0">
                <Tiptap />
            </div>
        </div>
    )
}