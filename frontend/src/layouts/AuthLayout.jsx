export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-pink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">💍 myvivahai</h1>
          <p className="text-gray-500 mt-1">AI-powered matrimonial platform</p>
        </div>
        {children}
      </div>
    </div>
  )
}
