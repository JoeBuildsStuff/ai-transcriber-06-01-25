import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Calendar, Building, Briefcase } from "lucide-react"
import { getContactById } from "../_lib/queries"

import { format, parseISO } from "date-fns"
import ContactNotes from "./_components/contact-notes"
import ContactFavorite from "./_components/contect-favorite"

function formatDate(dateString: string): string {
  if (!dateString) return ''
  
  try {
    const date = parseISO(dateString)
    return format(date, 'MMMM d, yyyy')
  } catch {
    return dateString
  }
}

function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return ''
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // Format based on length
  if (cleaned.length === 10) {
    // US format: (123) 456-7890
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US format with country code: +1 (123) 456-7890
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  } else {
    // Return original if doesn't match common formats
    return phoneNumber
  }
}

export default async function ContactDetailPage({
    params,
  }: {
    params: Promise<{ contactId: string }>
  }) {
    const {contactId} = await params

    const currentContact = await getContactById(contactId)

    return (
        <div>
        <Card className="mb-6 relative">
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {currentContact.firstName.charAt(0)}
                {currentContact.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl mb-1">
                {currentContact.displayName}
              </CardTitle>
              {currentContact.nickname && (
                <p className="text-muted-foreground mb-2">{currentContact.nickname}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {currentContact.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4">
          <ContactFavorite contactId={contactId} isFavorite={currentContact.isFavorite} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <h3 className="font-semibold text-lg">Contact Information</h3>
              
              {currentContact.primaryEmail && (
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Email</p>
                  </div>
                  <p className="font-medium">{currentContact.primaryEmail}</p>
                </div>
              )}

              {currentContact.primaryPhone && (
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Phone</p>
                  </div>
                  <p className="font-medium">{formatPhoneNumber(currentContact.primaryPhone)}</p>
                </div>
              )}

              {currentContact.birthday && (
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Birthday</p>
                  </div>
                  <p className="font-medium">{formatDate(currentContact.birthday)}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="font-semibold text-lg">Professional</h3>
              
              {currentContact.company && (
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Company</p>
                  </div>
                  <p className="font-medium">{currentContact.company}</p>
                </div>
              )}

              {currentContact.jobTitle && (
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Job Title</p>
                  </div>
                  <p className="font-medium">{currentContact.jobTitle}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

          <ContactNotes contactId={contactId} contactNotes={currentContact.notes} />

        </div>
    )
  }