import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import './searchable-select.css'

export type SelectOption = { value: string; label: string; description?: string }
type Props = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  ariaLabel: string
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
const matches = (option: SelectOption, query: string) => {
  const fields = [option.label, option.description || '']
  const initials = fields.flatMap(field => field.split(/[^\p{L}\p{N}]+/u).filter(Boolean)).map(word => word[0]).join('')
  return fields.some(field => normalize(field).includes(query)) || normalize(initials).includes(query)
}

export default function SearchableSelect({ value, options, onChange, placeholder = 'Selecione uma opção', disabled, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const selected = options.find(option => option.value === value)
  const visible = useMemo(() => {
    const term = normalize(query.trim())
    return term ? options.filter(option => matches(option, term)) : options
  }, [options, query])

  return <div className="searchable-select" ref={root}>
    <div className={`searchable-select-control ${open ? 'is-open' : ''}`}>
      <Search size={16} aria-hidden="true" />
      <input
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        value={open ? query : selected?.label || ''}
        placeholder={selected && !open ? selected.label : placeholder}
        disabled={disabled}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onChange={event => { setQuery(event.target.value); setOpen(true); if (value) onChange('') }}
        onBlur={() => window.setTimeout(() => { if (!root.current?.contains(document.activeElement)) setOpen(false) }, 120)}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); setQuery('') }
          if (event.key === 'Enter' && visible.length === 1) { event.preventDefault(); onChange(visible[0].value); setQuery(''); setOpen(false) }
        }}
      />
      <ChevronDown size={16} aria-hidden="true" />
    </div>
    {open && <div className="searchable-select-menu" role="listbox">
      {visible.length ? visible.map(option => <button type="button" role="option" aria-selected={option.value === value} key={option.value} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(option.value); setQuery(''); setOpen(false) }}>
        <span><b>{option.label}</b>{option.description && <small>{option.description}</small>}</span>
        {option.value === value && <Check size={16} />}
      </button>) : <p className="searchable-select-empty">Nenhum cadastro encontrado. Cadastre a opção no módulo correspondente.</p>}
    </div>}
  </div>
}
