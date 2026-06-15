export function formatCurrency(value: number | undefined | null) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value || 0))
}

export function currentFYRange(date = new Date()) {
  const year = date.getFullYear()
  const startYear = date.getMonth() >= 6 ? year : year - 1
  return {
    start: `${startYear}-07-01`,
    end: `${startYear + 1}-06-30`,
    label: `${startYear}/${String(startYear + 1).slice(2)}`,
  }
}

export function isInDateRange(value: string | undefined, start: string, end: string) {
  if (!value) return false
  const d = value.slice(0, 10)
  return d >= start && d <= end
}

export function thisMonthRange(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const start = `${y}-${m}-01`
  const end = `${y}-${m}-31`
  return { start, end }
}
