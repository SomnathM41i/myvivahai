/**
 * src/components/ui/JsonViewer.jsx
 * Syntax-highlighted collapsible JSON viewer.
 * No external dependency — pure CSS colouring.
 */
import { useState, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'

function highlight(json) {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-purple-600'         // number
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'text-blue-700 font-medium' : 'text-green-700'
        } else if (/true|false/.test(match)) {
          cls = 'text-orange-600'
        } else if (/null/.test(match)) {
          cls = 'text-gray-400'
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
}

export default function JsonViewer({ data, maxHeight = '400px' }) {
  const [copied, setCopied] = useState(false)

  const pretty = useMemo(() => {
    if (!data) return ''
    try {
      const obj = typeof data === 'string' ? JSON.parse(data) : data
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(data)
    }
  }, [data])

  const html = useMemo(() => highlight(pretty), [pretty])

  const copy = async () => {
    await navigator.clipboard.writeText(pretty)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!data) return <p className="text-sm text-gray-400 italic">No data available.</p>

  return (
    <div className="relative rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      <button
        onClick={copy}
        className="absolute top-2 right-2 flex items-center gap-1 text-xs text-gray-500
                   hover:text-gray-800 bg-white border border-gray-200 rounded px-2 py-1
                   transition-colors z-10"
      >
        {copied ? <><Check size={12} className="text-green-600" /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
      <div
        style={{ maxHeight, overflowY: 'auto' }}
        className="p-4 text-xs font-mono leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
