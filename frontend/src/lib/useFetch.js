import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from './api'

export default function useFetch(url, params) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const key = JSON.stringify(params || {})

  const load = useCallback(async () => {
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(url, { params: JSON.parse(key) })
      setData(res.data)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [url, key])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load, setData }
}
