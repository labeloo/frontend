import { getFullApiUrl } from '~/utils/url'

/**
 * Composable for handling API URLs, particularly for file/image URLs
 */
export const useImageUrl = () => {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl

  /**
   * Gets the full API base URL
   */
  const getApiUrl = () => apiUrl

  /**
   * Converts a relative API URL to a full URL
   * @param relativeUrl - The relative URL from the API
   */
  const getFullUrl = (relativeUrl: string) => getFullApiUrl(relativeUrl)

  /**
   * Handles task data URL conversion
   * @param task - Task object with dataUrl property
   */
  const getTaskImageUrl = (task: { dataUrl?: string }) => {
    if (!task.dataUrl) return ''
    return getFullApiUrl(task.dataUrl)
  }

  /**
   * Handles uploaded file URL conversion
   * @param uploadedFile - Uploaded file object with url property
   */
  const getUploadedFileUrl = (uploadedFile: { url?: string }) => {
    if (!uploadedFile.url) return ''
    return getFullApiUrl(uploadedFile.url)
  }

  return {
    getApiUrl,
    getFullUrl,
    getTaskImageUrl,
    getUploadedFileUrl
  }
}