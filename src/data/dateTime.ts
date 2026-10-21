/** Data locale yyyy-mm-dd per input type=date. */
export function todayDateInput(date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Combina data+ora locali in ISO UTC senza inventare fusi custom. */
export function localDateTimeToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  if (!/^\d{2}:\d{2}$/.test(time)) return null
  const when = new Date(`${date}T${time}:00`)
  if (Number.isNaN(when.getTime())) return null
  return when.toISOString()
}
