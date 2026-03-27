export default defineEventHandler(() => {
  return {
    success: true,
    message: 'AURA ARCHIVE Client is running',
    timestamp: new Date().toISOString(),
  }
})
