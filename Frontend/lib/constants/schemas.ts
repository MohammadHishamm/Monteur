import { z } from "zod"

export const searchParamsSchema = z.object({
  sort: z
    .enum(["asc", "desc"], {
      message: "الفرز غير صالح، القيم المسموحة: 'asc' أو 'desc'",
    })
    .optional()
    .default("desc")
    .catch("desc"),
  page: z.coerce
    .number()
    .optional()
    .refine((value) => value !== 0, { message: "Page cannot be 0" })
    .catch(1)
    .default(1),
  status: z
    .enum(["completed", "ongoing", "none"], {
      message: "حالة المورد غير صالحة، القيم المسموحة: 'completed' أو 'ongoing' أو 'none'",
    })
    .optional()
    .default("none")
    .catch("none"),
  publishStatus: z
    .enum(["pending", "published"], {
      message: "حالة النشر غير صالحة، القيم المسموحة: 'pending' أو 'published'",
    })
    .optional()
    .default("published")
    .catch("published"),
  search: z.string().optional().default("").catch(""),
})

export const announcementsSearchParamsSchema = z.object({
  search: z.string().optional().catch("").default(""),
  sort: z
    .enum(["asc", "desc"], {
      message: "الفرز غير صالح، القيم المسموحة: 'asc' أو 'desc'",
    })
    .optional()
    .default("desc")
    .catch("desc"),
  page: z.coerce
    .number()
    .optional()
    .refine((value) => value !== 0, { message: "Page cannot be 0" })
    .catch(1)
    .default(1),
  active: z
    .preprocess((val) => val === "true", z.boolean())
    .optional()
    .default(false)
    .catch(false),
  includeContent: z
    .preprocess((val) => val === "true", z.boolean())
    .optional()
    .default(false)
    .catch(false),
})

export const resourceActionsEmailSchema = z.string().email("البريد الإلكتروني غير صالح")

export const userSearchParamsSchema = z.object({
  sort: z
    .enum(["asc", "desc"], {
      message: "الفرز غير صالح، القيم المسموحة: 'asc' أو 'desc'",
    })
    .optional()
    .default("desc")
    .catch("desc"),
  page: z.coerce
    .number()
    .optional()
    .refine((value) => value !== 0, { message: "Page cannot be 0" })
    .catch(1)
    .default(1),
  search: z.string().optional().default("").catch(""),
  role: z
    .enum(["Admin", "Moderator", "Publisher", "all"], {
      message: "الدور غير صالح، القيم المسموحة: 'Admin' أو 'Moderator' أو 'Publisher' أو 'all'",
    })
    .optional()
    .default("Publisher")
    .catch("Publisher"),
})
