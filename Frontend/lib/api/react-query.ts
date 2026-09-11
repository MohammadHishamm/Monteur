export function nonNullableArray<T>(
  values: readonly (T | null | undefined)[] = []
): NonNullable<T>[] {
  return values.filter((value): value is NonNullable<T> => {
    return value !== undefined && value !== null
  })
}

export function isQueryHashesEqual(queryHash: string, targetKeyHash: string) {
  if (!targetKeyHash.length || !queryHash.length) {
    return false
  }

  return queryHash.includes(targetKeyHash)
}

export function hashKey(value: unknown[]) {
  return JSON.stringify(value)
}

export function matchQueryKey(queryHash: string, targetKeys: unknown[][]) {
  return targetKeys.some((key) => {
    if (!key.length) {
      return
    }

    //String with leading and trailing `[` and `]` removed
    const hashedKey = hashKey(key).slice(1, hashKey(key).length - 1)
    return isQueryHashesEqual(queryHash, hashedKey)
  })
}
