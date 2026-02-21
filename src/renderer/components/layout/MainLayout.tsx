import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import './MainLayout.css'

interface MainLayoutProps {
  title?: string
  showSidebar?: boolean
  children: React.ReactNode
}

export function MainLayout({
  title = 'Neon App',
  showSidebar = true,
  children
}: MainLayoutProps) {
  return (
    <div className="main-layout">
      <TitleBar title={title} />
      <div className="main-layout-body">
        {showSidebar && <Sidebar />}
        <main className="main-layout-content">
          {children}
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
