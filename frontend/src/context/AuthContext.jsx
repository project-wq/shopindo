import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { tokenStore } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  const refreshCart = useCallback(async () => {
    if (!tokenStore.get()) return setCartCount(0)
    try {
      const { data } = await api.get('/cart')
      setCartCount(data.groups.reduce((n, g) => n + g.items.length, 0))
    } catch {
      setCartCount(0)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null)
      setReady(true)
      return null
    }
    try {
      const { data } = await api.get('/auth/me')
      setUser(data)
      return data
    } catch {
      tokenStore.clear()
      setUser(null)
      return null
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    refreshUser().then((u) => u && refreshCart())
    const onLogout = () => setUser(null)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [refreshUser, refreshCart])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    tokenStore.set(data.token)
    setUser(data.user)
    refreshCart()
    return data.user
  }

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    tokenStore.set(data.token)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // token sudah tidak valid
    }
    tokenStore.clear()
    setUser(null)
    setCartCount(0)
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, refreshUser, cartCount, refreshCart }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
