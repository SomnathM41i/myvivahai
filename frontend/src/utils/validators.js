export const isValidFile = (file) =>
  ['pdf','docx','doc','jpg','jpeg','png','txt'].includes(file.name.split('.').pop().toLowerCase())
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
export const isValidMobile = (mobile) => /^[6-9]\d{9}$/.test(mobile)
