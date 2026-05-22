import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useProfile } from '../hooks/useProfile'
import { useNavigate } from 'react-router-dom'

const FIELDS = [
  ['Personal', [
    ['Full Name','full_name'],['Date of Birth','date_of_birth'],['Gender','gender'],
    ['Religion','religion'],['Caste','caste'],['Mother Tongue','mother_tongue'],
    ['Height','height'],['Blood Group','blood_group'],['Mobile','mobile'],
  ]],
  ['Education & Career', [
    ['Education','education'],['Occupation','occupation'],
    ['Annual Income','annual_income'],['City','city'],['State','state'],
  ]],
  ['Family', [
    ["Father's Name",'father_name'],["Mother's Name",'mother_name'],
    ['Siblings','siblings'],['Family Type','family_type'],
  ]],
  ['Horoscope', [
    ['Rashi','rashi'],['Nakshatra','nakshatra'],['Gotra','gotra'],['Manglik','manglik'],
  ]],
]

export default function EditProfile() {
  const { profile, update, isUpdating } = useProfile()
  const { register, handleSubmit, reset } = useForm()
  const navigate = useNavigate()

  useEffect(() => { if (profile) reset(profile) }, [profile, reset])

  const onSubmit = (data) => update(data, { onSuccess: () => navigate('/profile') })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Profile</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {FIELDS.map(([section, fields]) => (
          <div key={section} className="card">
            <h2 className="font-semibold text-gray-800 mb-4">{section}</h2>
            <div className="grid grid-cols-2 gap-4">
              {fields.map(([label, name]) => (
                <div key={name}>
                  <label className="label">{label}</label>
                  <input {...register(name)} className="input" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="lg:col-span-2 flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/profile')}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={isUpdating} className="btn-primary">
            {isUpdating ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
