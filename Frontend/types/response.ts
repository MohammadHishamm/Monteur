export type ResWithData<T> = {
  data: T
}

export type ResWithDataMeta<T, M> = {
  data: T
  meta: M
}

export type ResError = {
  error: string
}

export type TListMeta = {
  page: number
  offset: number
  limit: number
  total?: number
}
