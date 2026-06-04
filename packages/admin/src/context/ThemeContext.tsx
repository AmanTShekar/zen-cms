import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
 theme: Theme
 toggleTheme: () => void
 setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [theme, setThemeState] = useState<Theme>('dark')

 // Force dark mode at root level
 useEffect(() => {
 const root = window.document.documentElement
 root.classList.remove('light')
 root.classList.add('dark')
 localStorage.setItem('zenith_theme', 'dark')
 }, [])

 const setTheme = (newTheme: Theme) => {
 // Only allow dark
 setThemeState('dark')
 }

 const toggleTheme = () => {
 // No-op to prevent light mode
 }

 return (
 <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
 {children}
 </ThemeContext.Provider>
 )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
 const context = useContext(ThemeContext)
 if (!context) throw new Error('useTheme must be used within ThemeProvider')
 return context
}
