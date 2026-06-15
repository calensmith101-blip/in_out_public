'use client'

import type { FieldConfig } from '@/types/app'

export default function FieldInput({ field, value, onChange }: { field: FieldConfig, value: any, onChange: (value: any) => void }) {
  const type = field.type || 'text'
  if (type === 'textarea') {
    return <textarea className="wj-input min-h-28" required={field.required} placeholder={field.placeholder} value={value ?? ''} onChange={e => onChange(e.target.value)} />
  }
  if (type === 'select') {
    return <select className="wj-input" required={field.required} value={value ?? field.defaultValue ?? ''} onChange={e => onChange(e.target.value)}>
      <option value="">Select...</option>
      {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  }
  if (type === 'checkbox') {
    return <label className="flex items-center gap-2 text-sm text-wj-subtle"><input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} /> Yes</label>
  }
  return <input className="wj-input" type={type} required={field.required} placeholder={field.placeholder} value={value ?? ''} onChange={e => onChange(type === 'number' ? Number(e.target.value || 0) : e.target.value)} />
}
