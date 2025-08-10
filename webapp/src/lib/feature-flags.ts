export const features = {
  notifications: import.meta.env.VITE_FEATURE_NOTIFICATIONS === 'true',
  communities: import.meta.env.VITE_FEATURE_COMMUNITIES === 'true',
}
