import { useProfile } from '../hooks/useProfile'
import { Link } from 'react-router-dom'
import { Edit, Upload } from 'lucide-react'

const F = ({ label, value }) => value ? (
  <div>
    <p className="label">{label}</p>
    <p className="text-gray-800">{value}</p>
  </div>
) : null

export default function ProfilePreview() {
  const { profile, isLoading } = useProfile()
  if (isLoading) return <p className="text-gray-400">Loading profile…</p>
  if (!profile) return (
    <div className="text-center py-16">
      <p className="text-gray-500 mb-4">No profile yet. Upload a biodata to get started.</p>
      <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
        <Upload size={16} />Upload Biodata
      </Link>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{profile.full_name || 'My Profile'}</h1>
          {profile.ai_confidence != null && (
            <p className="text-sm text-gray-500 mt-1">
              AI confidence: {Math.round(profile.ai_confidence * 100)}%
            </p>
          )}
        </div>
        <Link to="/profile/edit" className="btn-primary inline-flex items-center gap-2">
          <Edit size={16} />Edit
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Personal</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Date of Birth" value={profile.date_of_birth} />
            <F label="Gender" value={profile.gender} />
            <F label="Religion" value={profile.religion} />
            <F label="Caste" value={profile.caste} />
            <F label="Mother Tongue" value={profile.mother_tongue} />
            <F label="Height" value={profile.height} />
            <F label="Blood Group" value={profile.blood_group} />
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Education & Career</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Education" value={profile.education} />
            <F label="Occupation" value={profile.occupation} />
            <F label="Annual Income" value={profile.annual_income} />
            <F label="City" value={profile.city} />
            <F label="State" value={profile.state} />
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Family</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Father's Name" value={profile.father_name} />
            <F label="Mother's Name" value={profile.mother_name} />
            <F label="Siblings" value={profile.siblings} />
            <F label="Family Type" value={profile.family_type} />
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Horoscope</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Rashi" value={profile.rashi} />
            <F label="Nakshatra" value={profile.nakshatra} />
            <F label="Gotra" value={profile.gotra} />
            <F label="Manglik" value={profile.manglik} />
          </div>
        </div>
      </div>
    </div>
  )
}
