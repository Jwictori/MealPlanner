import { useStore } from '../store/useStore'

const navItems = [
  { id: 'recipes' as const, label: 'Recept', icon: '📖' },
  { id: 'planning' as const, label: 'Planering', icon: '📅' },
  { id: 'shopping' as const, label: 'Inköp', icon: '🛒' },
  { id: 'settings' as const, label: 'Inställningar', icon: '⚙️' },
]

export function Navigation() {
  const { currentView, setCurrentView } = useStore()

  return (
    <nav className="sticky bottom-0 bg-surface border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
              currentView === item.id
                ? 'text-primary'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className="text-xs font-semibold">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
