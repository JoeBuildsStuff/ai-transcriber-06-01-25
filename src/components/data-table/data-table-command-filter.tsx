import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DataTableCommandFilter() {
  return (
    <div className="flex flex-row items-center gap-0 p-2">
        <Select>
            <SelectTrigger className="w-fit rounded-r-none">
                <Calendar className="size-4 shrink-0" />
                <Calendar className="size-4 shrink-0" />
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="due">Due</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                    <SelectItem value="started">Started</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>

        <Select>
            <SelectTrigger className="w-fit rounded-none">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="after">after</SelectItem>
                    <SelectItem value="before">before</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>

        <Select>
            <SelectTrigger className="w-fit rounded-none">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="1 day">1 day</SelectItem>
                    <SelectItem value="3 days">3 days</SelectItem>
                    <SelectItem value="1 week">1 week</SelectItem>
                    <SelectItem value="1 month">1 month</SelectItem>
                    <SelectItem value="3 months">3 months</SelectItem>
                    <SelectItem value="6 months">6 months</SelectItem>
                    <SelectItem value="1 year">1 year</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>

        <Select>
            <SelectTrigger className="w-fit rounded-none">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="ago">ago</SelectItem>
                    <SelectItem value="from now">from now</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>

        <Button variant="outline" className="rounded-l-none">
            <X className="size-4 shrink-0" />
        </Button>
    </div>  
  )
}