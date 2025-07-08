export type Person = {
  id: string;
  created_at?: string;
  updated_at?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  company_id?: string | null;
  job_title?: string;
  description?: string;
  linkedin?: string;
}

export type Company = {
  id: string;
  created_at?: string;
  name: string;
  description?: string;
}

export type PersonEmail = {
  id: string;
  contact_id: string;
  email: string;
  display_order: number;
  created_at?: string;
}

export type PersonPhone = {
  id: string;
  contact_id: string;
  phone: string;
  display_order: number;
  created_at?: string;
}

// Enhanced types with relationships
export type PersonWithCompany = Person & {
  company?: Company;
}

export type PersonWithRelations = Person & {
  company?: Company;
  emails: PersonEmail[];
  phones: PersonPhone[];
}

// Form-specific types (for your React component)
export type PersonFormData = {
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
  contacts: PersonWithCompany[];
  total: number;
}

export type ContactDetailResponse = PersonWithRelations;

// Insert/Update types (without generated fields)
export type PersonInsert = Omit<Person, 'id' | 'created_at' | 'updated_at'>;
export type PersonUpdate = Partial<PersonInsert>;

export type PersonEmailInsert = Omit<PersonEmail, 'id' | 'created_at'>;
export type PersonPhoneInsert = Omit<PersonPhone, 'id' | 'created_at'>;

export type CompanyInsert = Omit<Company, 'id' | 'created_at'>;

// Utility types for the component
export type PersonData = {
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