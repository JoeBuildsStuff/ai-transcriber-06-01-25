"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createContact, updateContact } from "@/actions/contacts"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

const contactSchema = z.object({
  id: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  nickname: z.string().optional(),
  primary_email: z
    .string()
    .email({ message: "Invalid email address" })
    .optional()
    .or(z.literal("")),
  primary_phone: z.string().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  birthday: z.string().optional(),
  notes: z.string().optional(),
  is_favorite: z.boolean().default(false).optional(),
  tags: z.string().optional(),
})

export type ContactFormValues = z.infer<typeof contactSchema>

interface ContactSheetProps {
  children?: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: ContactFormValues
}

export function ContactSheet({
  children,
  open,
  onOpenChange,
  contact,
}: ContactSheetProps) {
  const isEditMode = !!contact

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  })

  useEffect(() => {
    if (isEditMode) {
      form.reset({
        id: contact.id,
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        nickname: contact.nickname || "",
        primary_email: contact.primary_email || "",
        primary_phone: contact.primary_phone || "",
        company: contact.company || "",
        job_title: contact.job_title || "",
        birthday: contact.birthday || "",
        notes: contact.notes || "",
        is_favorite: contact.is_favorite || false,
        tags: Array.isArray(contact.tags) ? contact.tags.join(", ") : (contact.tags || ""),
      })
    } else {
      form.reset({
        first_name: "",
        last_name: "",
        nickname: "",
        primary_email: "",
        primary_phone: "",
        company: "",
        job_title: "",
        birthday: "",
        notes: "",
        is_favorite: false,
        tags: "",
      })
    }
  }, [open, contact, isEditMode, form])

  async function onSubmit(values: ContactFormValues) {
    const formData = new FormData()
    if (isEditMode && contact?.id) {
      formData.append("id", contact.id)
    }

    Object.entries(values).forEach(([key, value]) => {
      formData.append(key, value ? String(value) : "")
    })

    const result = isEditMode
      ? await updateContact(formData)
      : await createContact(formData)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(
        `Contact ${isEditMode ? "updated" : "created"} successfully`
      )
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children}
      <SheetContent className="">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? "Edit Contact" : "Create New Contact"}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? "Update the details of your contact."
              : "Fill in the details below to create a new contact."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 grid grid-cols-2 gap-4 px-4 overflow-y-auto"
          >
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="Johnny" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primary_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primary_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(123) 456-7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="job_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Software Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="birthday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birthday</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="YYYY-MM-DD"
                      {...field}
                      value={field.value ? field.value.split("T")[0] : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input placeholder="lead, client, vip" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="col-span-2">
              <FormField
                control={form.control}
                name="is_favorite"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Favorite</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="col-span-2">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add some notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {isEditMode && (
              <>
                <div className="col-span-2 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-500">
                    System Information
                  </h3>
                </div>
                <FormItem>
                  <FormLabel>ID</FormLabel>
                  <FormControl>
                    <Input disabled value={contact?.id} />
                  </FormControl>
                </FormItem>
              </>
            )}

            <SheetFooter className="col-span-2 flex flex-row justify-between w-full pt-4">
              <SheetClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" variant="secondary">
                {isEditMode ? "Save Changes" : "Create Contact"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}