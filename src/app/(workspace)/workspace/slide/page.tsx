// TODO: still working on this page

import Tiptap from "@/components/tiptap/tiptap";

export default function SlidePage() {

    return (
        <div className="flex flex-col h-full gap-2">
            <div className="flex flex-row h-1/10 items-center gap-2">
                <div className="w-6/10 h-full"><Tiptap showFixedMenu={false} content="Title" /></div>
                <div className="w-4/10 h-full"><Tiptap showFixedMenu={false} content="Owner" /></div>
            </div>

            <div className="flex flex-row h-1/10 items-center gap-2">
                <div className="w-1/2 h-full"><Tiptap showFixedMenu={false} content="Overall Program" /></div>
                <div className="w-1/2 h-full"><Tiptap showFixedMenu={false} content="Program Initiatives" /></div>
            </div>

            <div className="flex flex-row h-8/10  items-center gap-2">
                <div className="flex flex-col w-1/2 h-full gap-2 ">
                    <div className="w-full h-1/2 rounded-sm"><Tiptap showFixedMenu={false} content="Program Status" /></div>
                    <div className="w-full h-1/2 rounded-sm"><Tiptap showFixedMenu={false} content="Key Deliverables" /></div>
                </div>

                <div className="flex flex-col  w-1/2 h-full gap-2">
                    <div className="w-full h-4/10 rounded-sm"><Tiptap showFixedMenu={false} content="Timeline Gantt" /></div>
                    <div className="w-full h-3/10 rounded-sm"><Tiptap showFixedMenu={false} content="Key Risks" /></div>
                    <div className="w-full h-3/10 rounded-sm"><Tiptap showFixedMenu={false} content="KPIs" /></div>
                </div>
            </div>
        </div>
    )
}