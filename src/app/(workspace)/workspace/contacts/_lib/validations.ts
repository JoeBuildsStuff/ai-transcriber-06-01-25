// Base table types (matching your database schema)
export type Contact = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  city?: string | null;
  state?: string | null;
  company_id?: string | null;
  job_title?: string | null;
  description?: string | null;
  linkedin?: string | null;
  user_id?: string | null;
}

export type Company = {
  id: string;
  created_at?: string | null;
  name: string;
  description?: string | null;
  user_id?: string | null;
}

export type ContactEmail = {
  id: string;
  contact_id: string | null;
  email: string;
  display_order: number | null;
  created_at?: string | null;
  user_id?: string | null;
}

export type ContactPhone = {
  id: string;
  contact_id: string | null;
  phone: string;
  display_order: number | null;
  created_at?: string | null;
  user_id?: string | null;
}

// Enhanced types with relationships
export type ContactWithCompany = Contact & {
  company?: Company;
}

export type ContactWithRelations = Contact & {
  company?: Company;
  emails: ContactEmail[];
  phones: ContactPhone[];
}

// Form-specific types (for your React component)
export type ContactFormData = {
  firstName: string;
  lastName: string;
  emails: string[];
  phones: string[];
  city: string;
  state: string;
  company: string;
  description: string;
  linkedin: string;
  jobTitle: string;
}

// API response types
export type ContactListResponse = {
  contacts: ContactWithCompany[];
  total: number;
}

export type ContactDetailResponse = ContactWithRelations;

// Insert/Update types (without generated fields)
export type ContactInsert = Omit<Contact, 'id' | 'created_at' | 'updated_at'>;
export type ContactUpdate = Partial<ContactInsert>;

export type ContactEmailInsert = Omit<ContactEmail, 'id' | 'created_at'>;
export type ContactPhoneInsert = Omit<ContactPhone, 'id' | 'created_at'>;

export type CompanyInsert = Omit<Company, 'id' | 'created_at'>;

// Utility types for the component
export type ContactData = {
  firstName: string;
  lastName: string;
  emails: string[];
  phones: string[];
  city: string;
  state: string;
  company: string;
  description: string;
  linkedin: string;
  jobTitle: string;
}