export const sortListValues = {
  desc: "الأحدث",
  asc: "الأقدم",
}

export const statusValues = {
  none: "الكل",
  completed: "مكتملة",
  ongoing: "مستمرة",
}

export const publishStatusValues = {
  published: "منشورة",
  pending: "قيد الانتظار",
}

export const viewsChartRangesValues = {
  daily: [
    {
      value: 3,
      name: "3 أيام",
    },
    {
      value: 7,
      name: "أسبوع",
    },
    {
      value: 30,
      name: "شهر",
    },
  ],
  monthly: [
    {
      value: 3,
      name: "3 أشهر",
    },
    {
      value: 5,
      name: "5 أشهر",
    },
    {
      value: 12,
      name: "سنة",
    },
  ],
  yearly: [
    {
      value: 1,
      name: "سنة",
    },
    {
      value: 2,
      name: "سنتان",
    },
    {
      value: 3,
      name: "3 سنوات",
    },
  ],
}

export const SIXTY_DAYS_MS = 1000 * 60 * 60 * 24 * 60
