/**
 * exportService.js
 * Handles exporting profile data to JSON or Excel (XLSX).
 * XLSX uses SheetJS loaded from CDN via a dynamic import shim.
 */

const PROFILE_LABELS = {
  full_name:        'Full Name',
  date_of_birth:    'Date of Birth',
  gender:           'Gender',
  religion:         'Religion',
  caste:            'Caste',
  mother_tongue:    'Mother Tongue',
  height:           'Height',
  blood_group:      'Blood Group',
  mobile:           'Mobile',
  email:            'Email',
  city:             'City',
  state:            'State',
  education:        'Education',
  occupation:       'Occupation',
  annual_income:    'Annual Income',
  father_name:      "Father's Name",
  mother_name:      "Mother's Name",
  siblings:         'Siblings',
  family_type:      'Family Type',
  rashi:            'Rashi',
  nakshatra:        'Nakshatra',
  gotra:            'Gotra',
  manglik:          'Manglik',
  partner_preference: 'Partner Preference',
  ai_confidence:    'AI Confidence',
}

/** Download profile as a formatted JSON file */
export function exportJSON(profile) {
  const exportData = {}
  for (const [key, label] of Object.entries(PROFILE_LABELS)) {
    if (profile[key] != null && profile[key] !== '') {
      exportData[label] = key === 'ai_confidence'
        ? `${Math.round(profile[key] * 100)}%`
        : profile[key]
    }
  }
  exportData['Exported At'] = new Date().toISOString()

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  triggerDownload(blob, `${slugify(profile.full_name)}_profile.json`)
}

/** Download profile as an Excel (.xlsx) file using SheetJS from CDN */
export async function exportExcel(profile) {
  // Dynamically load SheetJS from CDN
  const XLSX = await loadXLSX()

  const rows = []
  for (const [key, label] of Object.entries(PROFILE_LABELS)) {
    if (profile[key] != null && profile[key] !== '') {
      rows.push({
        Field: label,
        Value: key === 'ai_confidence'
          ? `${Math.round(profile[key] * 100)}%`
          : String(profile[key]),
      })
    }
  }
  rows.push({ Field: 'Exported At', Value: new Date().toLocaleString('en-IN') })

  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [{ wch: 22 }, { wch: 40 }]

  // Style header row (SheetJS community edition supports basic cell formatting)
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'E8F0FE' } } }
  ;['A1', 'B1'].forEach(cell => {
    if (ws[cell]) ws[cell].s = headerStyle
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Profile')

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  triggerDownload(blob, `${slugify(profile.full_name)}_profile.xlsx`)
}

// ── helpers ───────────────────────────────────────────────────────────────────

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function slugify(name = 'profile') {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

let _xlsx = null
async function loadXLSX() {
  if (_xlsx) return _xlsx
  // Load from CDN
  await new Promise((resolve, reject) => {
    if (window.XLSX) { _xlsx = window.XLSX; resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload = () => { _xlsx = window.XLSX; resolve() }
    script.onerror = reject
    document.head.appendChild(script)
  })
  return _xlsx
}