import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "../ui/input"

export default function DataTableCommandFilter() {
  return (
    <div className="flex flex-col items-center gap-2 p-2">
        {/* general command filter */}
        <div className="flex flex-row items-center gap-0">
            {/* select column */}
            <Select>
                <SelectTrigger className="w-fit rounded-r-none">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectItem value="first_name">First Name</SelectItem>
                        <SelectItem value="last_name">Last Name</SelectItem>
                        <SelectItem value="description">Description</SelectItem>
                        <SelectItem value="job_title">Job Title</SelectItem>
                        <SelectItem value="linkedin">Linkedin</SelectItem>
                        <SelectItem value="created_at">Created At</SelectItem>
                        <SelectItem value="updated_at">Updated At</SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>

            {/* select operator */}
            <Select>
                <SelectTrigger className="w-fit rounded-none">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectItem value="iLike">Contains</SelectItem>
                        <SelectItem value="notILike">Does not contain</SelectItem>
                        <SelectItem value="eq">Is</SelectItem>
                        <SelectItem value="ne">Is not</SelectItem>
                        <SelectItem value="isEmpty">Is empty</SelectItem>
                        <SelectItem value="isNotEmpty">Is not empty</SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>

            {/* select value */}
            <Input className="w-fit rounded-none" />

            <Button variant="outline" className="rounded-l-none">
                <X className="size-4 shrink-0" />
            </Button>
        </div>

        {/* relative date command filter */}
        <div className="flex flex-row items-center gap-0">
            <Select>
                <SelectTrigger className="w-fit rounded-r-none">
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
    </div>  
  )
}