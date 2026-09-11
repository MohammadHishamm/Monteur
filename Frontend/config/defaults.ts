export const defaultsConfig = {
  fullName: process.env.NEXT_PUBLIC_FULLNAME ?? "Aria User",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "example@email.com",
  announce: "لا يوجد",
  listing: { limit: 10, page: 1 },
}
