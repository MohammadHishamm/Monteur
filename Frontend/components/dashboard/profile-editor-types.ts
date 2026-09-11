import type { Category, LanguageSkill } from "@/components/freelancers/types";

export interface EditableProject {
  id: string;
  title: string;
  summary: string;
  category: Category;
  year: string;
  duration: string;
  liveUrl?: string;
  description: string;
  images: string[];
  videoUrl?: string;
}

export interface EditableProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  tagline: string;
  category: Category;
  rate: number;
  city: string;
  country: string;
  available: boolean;
  about: string;
  skills: string[];
  languages: LanguageSkill[];
  projects: EditableProject[];
}
