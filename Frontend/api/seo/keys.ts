export const seoKeys = {
  all: () => ["seo"],
  options: {
    base: () => [...seoKeys.all(), "options"],
    lists: () => [...seoKeys.options.base(), "lists"],
  },
  templates: {
    base: () => [...seoKeys.all(), "templates"],
    job: (jobId: string) => [...seoKeys.templates.base(), "job", jobId],
    freelancer: (freelancerId: string) => [...seoKeys.templates.base(), "freelancer", freelancerId],
    project: (projectId: string) => [...seoKeys.templates.base(), "project", projectId],
    byType: (type: string) => [...seoKeys.templates.base(), type],
  },
}
