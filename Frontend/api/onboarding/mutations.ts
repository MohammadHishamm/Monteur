import { axios } from "@/lib/api/axios"
import type { ClientOnboarding, ClientOnboardingBody, FreelancerOnboarding, FreelancerOnboardingBody, OnboardingResult } from "~/types/onboarding"



export async function saveClientOnboarding(data: ClientOnboarding): Promise<OnboardingResult> {
  const body: ClientOnboardingBody = {
    full_name: data.fullName,
    company_name: "",
    company_website: data.website,
    industry: data.industry,
    company_size: data.companySize,
    hiring_intent: data.hiringIntent,
    urgency: data.urgency,
    budget_band: data.budgetBand,
    engagement: data.engagement,
  }
  const res = await axios.post<{ data: OnboardingResult }>("/onboarding/client", body)
  return res.data.data
}

export async function saveFreelancerOnboarding(data: FreelancerOnboarding): Promise<OnboardingResult> {
  const body: FreelancerOnboardingBody = {
    full_name: data.fullName,
    role: data.role,
    tagline: data.tagline,
    about: data.about,
    city: data.city,
    country: data.country,
    category: data.category,
    skills: data.skills,
    experience: data.experience,
    avatar: data.avatar,
    portfolio: data.portfolio,
  }
  const res = await axios.post<{ data: OnboardingResult }>("/onboarding/freelancer", body)
  return res.data.data
}
