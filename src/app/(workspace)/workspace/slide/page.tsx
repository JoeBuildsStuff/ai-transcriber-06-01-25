// TODO: still working on this page


export default function SlidePage() {

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex flex-row h-1/10 items-center gap-2">
                <div className="border border-border w-6/10 h-full ">Title</div>
                <div className="border border-border w-4/10 h-full">Table</div>
            </div>

            <div className="flex flex-row h-1/10 items-center gap-2">
                <div className="border border-border w-1/2 h-full ">Overall Program...</div>
                <div className="border border-border w-1/2 h-full">Program Initiatives</div>
            </div>

            <div className="flex flex-row h-8/10  items-center gap-2">
                <div className="flex flex-col w-1/2 h-full gap-2 ">
                    <div className="border border-border w-full h-1/2">Program Status</div>
                    <div className="border border-border w-full h-1/2">Key Deliverables</div>
                </div>

                <div className="flex flex-col  w-1/2 h-full gap-2">
                    <div className="border border-border w-full h-4/10">Timeline Gantt</div>
                    <div className="border border-border w-full h-3/10">Key Risks</div>
                    <div className="border border-border w-full h-3/10">KPIs</div>
                </div>
            </div>
        </div>
    )
}