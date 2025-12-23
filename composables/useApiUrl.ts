export const useApiUrl = () => {
  const config = useRuntimeConfig()
  return config.public.apiUrl
}
