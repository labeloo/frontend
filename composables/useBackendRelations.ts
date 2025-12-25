export const useBackendRelations = () => {
    // State for storing backends per organization
    const backends = useState<Record<string, any[]>>('backend-relations', () => ({}))
    
    // State for the selected backend ID
    const selectedBackendId = useState<number | null>('selected-backend-id', () => null)
    
    const { fetch: apiFetch } = useApi()

    // Initialize from local storage on client side
    // We use onMounted or check process.client to avoid hydration mismatches, 
    // but since this is a composable called in setup, we can check process.client directly
    // However, to be safe and avoid hydration issues, we might want to do this initialization 
    // only once or in a specific lifecycle hook in the component. 
    // But for simplicity in usage, we can check if it's null and client side.
    if (process.client && selectedBackendId.value === null) {
        const saved = localStorage.getItem('labeloo-magic-backend-id')
        if (saved) {
            selectedBackendId.value = Number(saved)
        }
    }

    // Watch for changes to save to local storage
    // We need to ensure this watch is only set up once or handles multiple setups gracefully.
    // Since useState is shared, the watcher might be set up multiple times if we are not careful.
    // A better approach for the watcher is inside the component or using a singleton pattern if possible.
    // But for now, let's rely on the component to trigger the save or just do it in the setter if we had one.
    // Actually, we can just watch in the component or here. 
    // If we put it here, every component using this composable will attach a watcher.
    // Let's put the persistence logic in the component or make a dedicated init function.
    // For now, I'll add a helper to persist.

    const fetchBackends = async (organizationId: string | number, force = false) => {
        if (!organizationId) return []
        
        const orgIdStr = organizationId.toString()
        
        // Return cached if available and not forced
        if (!force && backends.value[orgIdStr] && backends.value[orgIdStr].length > 0) {
            return backends.value[orgIdStr]
        }

        try {
            const response = await apiFetch('/api/backendRelations', {
                headers: {
                    'orgId': orgIdStr
                }
            })
            const result = await response.json()
            if (result.data) {
                backends.value[orgIdStr] = result.data
                
                // If no selection but backends exist, select the first one
                if (!selectedBackendId.value && result.data.length > 0) {
                    selectedBackendId.value = result.data[0].id
                }
                // If selected backend is not in the new list (and we have a list), 
                // check if we should keep it (maybe it's from another org?)
                // For now, if we switch orgs, we might want to reset or check validity.
                // But since ID is unique globally usually, we can keep it if it exists in the list.
                else if (selectedBackendId.value) {
                    const exists = result.data.find((b: any) => b.id === selectedBackendId.value)
                    // If the currently selected backend is NOT in this organization's list,
                    // we might want to switch to one that IS in the list.
                    if (!exists && result.data.length > 0) {
                        selectedBackendId.value = result.data[0].id
                    }
                }
            }
            return backends.value[orgIdStr] || []
        } catch (error) {
            console.error('Failed to fetch backends:', error)
            return []
        }
    }

    const getBackends = (organizationId: string | number) => {
        if (!organizationId) return []
        return backends.value[organizationId.toString()] || []
    }

    const getSelectedBackend = (organizationId: string | number) => {
        const list = getBackends(organizationId)
        return list.find(b => b.id === selectedBackendId.value)
    }

    const setSelectedBackend = (id: number | null) => {
        selectedBackendId.value = id
        if (process.client) {
            if (id) {
                localStorage.setItem('labeloo-magic-backend-id', id.toString())
            } else {
                localStorage.removeItem('labeloo-magic-backend-id')
            }
        }
    }

    return {
        backends,
        selectedBackendId,
        fetchBackends,
        getBackends,
        getSelectedBackend,
        setSelectedBackend
    }
}
