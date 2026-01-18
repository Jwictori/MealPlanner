import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useShoppingList } from '../../hooks/useShoppingList'
import { ShoppingListView } from '../ShoppingListView'
import { ShoppingListCreatorWizard } from '../ShoppingListCreatorWizard'
import { ShoppingListSyncManager } from '../../lib/shoppingListSyncManager'
import { SyncConflictDialog } from '../SyncConflictDialog'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import type { ShoppingListItem } from '@shared/shoppingListTypes'

export function ShoppingView() {
  const { user, recipes, mealPlans } = useStore()
  const [isCreatorOpen, setIsCreatorOpen] = useState(false)
  const [syncConflicts, setSyncConflicts] = useState<any>(null)

  // Use the shopping list hook
  const {
    shoppingLists,
    selectedList,
    listItems,
    loading,
    needsSync,
    itemsByList,
    setSelectedList,
    createShoppingLists,
    checkItem,
    updateItem,
    deleteItem,
    markListComplete,
    deleteList,
    regenerateList,
  } = useShoppingList({
    userId: user?.id,
    mealPlans,
    recipes,
  })

  const handleExport = () => {
    if (!selectedList || !listItems) return

    // Generate text export
    let text = `${selectedList.name}\n`
    text += `${format(parseISO(selectedList.date_range_start), 'd MMM', { locale: sv })} - ${format(parseISO(selectedList.date_range_end), 'd MMM yyyy', { locale: sv })}\n\n`

    // Group by category (simplified)
    const unchecked = listItems.filter(item => !item.checked)

    unchecked.forEach(item => {
      text += `☐ ${item.ingredient_name} ${item.quantity} ${item.unit}\n`
    })

    // Copy to clipboard
    navigator.clipboard.writeText(text)
    alert('Inköpslista kopierad till urklipp!')
  }

  const handleCreatorComplete = async (generatedLists: any[]) => {
    if (!user) {
      console.error('[ShoppingView] No user!')
      return
    }

    console.log('[ShoppingView] Creating lists:', generatedLists.length)

    const success = await createShoppingLists(
      generatedLists.map(list => ({
        name: list.name,
        date_range_start: list.date_range_start,
        date_range_end: list.date_range_end,
        status: list.status || 'active',
        split_mode: list.split_mode || 'single',
        warnings: list.warnings || [],
      }))
    )

    if (success) {
      setIsCreatorOpen(false)
    }
  }

  const handleSync = async () => {
    if (!selectedList || !user) return

    const analysis = ShoppingListSyncManager.analyzeChanges(
      selectedList,
      listItems,
      [],
      mealPlans,
      recipes
    )

    if (analysis.conflicts.length > 0) {
      setSyncConflicts(analysis)
    } else {
      const success = await regenerateList(selectedList.id, true)
      if (success) {
        alert('✅ Listan synkad! Inhandlade varor är bevarade.')
      } else {
        alert('❌ Kunde inte synka listan. Försök igen.')
      }
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Ta bort denna vara från listan?')) return
    await deleteItem(itemId)
  }

  const handleMarkComplete = async () => {
    await markListComplete()
  }

  const handleDeleteList = async () => {
    if (!confirm('Ta bort hela inköpslistan?')) return
    await deleteList()
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold mb-2">Inköpslistor</h2>
        <p className="text-text-secondary">Logga in för att se dina inköpslistor</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4 animate-bounce">🛒</div>
        <p className="text-text-secondary">Laddar inköpslistor...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Inköpslistor</h2>
          <div className="flex gap-2">
            {selectedList && needsSync && (
              <button
                onClick={handleSync}
                className="relative px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2 animate-pulse"
              >
                <span>🔄</span>
                <span>Synka med planering</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
            )}
            <button
              onClick={() => setIsCreatorOpen(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span>➕</span>
              <span>Skapa ny lista</span>
            </button>
          </div>
        </div>
        <p className="text-text-secondary">
          Hantera dina inköpslistor baserade på din matplanering
          {needsSync && (
            <span className="ml-2 text-orange-600 font-medium">
              • Matplaneringen har ändrats
            </span>
          )}
        </p>
      </div>

      {/* Main content */}
      {shoppingLists.length === 0 ? (
        // Empty state
        <div className="text-center py-20 bg-surface rounded-2xl border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold mb-2">Inga inköpslistor ännu</h3>
          <p className="text-text-secondary mb-6">
            Skapa din första inköpslista baserad på din matplanering!
          </p>
          <button
            onClick={() => setIsCreatorOpen(true)}
            className="px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2"
          >
            <span>🛒</span>
            <span>Skapa inköpslista</span>
          </button>

          {mealPlans.length === 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl inline-block">
              <p className="text-sm text-yellow-800">
                💡 Tips: Planera några måltider först i Planering-fliken!
              </p>
            </div>
          )}
        </div>
      ) : (
        // Lists view
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - List of lists */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-semibold text-lg mb-3">Dina listor</h3>

            {shoppingLists.map(list => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative group"
              >
                <button
                  onClick={() => setSelectedList(list)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    selectedList?.id === list.id
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-surface border-2 border-gray-200 hover:border-primary'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-semibold truncate">{list.name}</h4>
                      <p className={`text-sm mt-1 ${
                        selectedList?.id === list.id ? 'text-white/80' : 'text-text-secondary'
                      }`}>
                        {format(parseISO(list.date_range_start), 'd MMM', { locale: sv })} -
                        {format(parseISO(list.date_range_end), 'd MMM', { locale: sv })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      list.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : list.status === 'completed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {list.status === 'active' ? 'Aktiv' : list.status === 'completed' ? 'Klar' : 'Arkiverad'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${
                        selectedList?.id === list.id ? 'text-white/90' : 'text-text-secondary'
                      }`}>
                        {(() => {
                          const items = itemsByList.get(list.id) || []
                          const checked = items.filter((i: ShoppingListItem) => i.checked).length
                          const total = items.length
                          const percentage = total > 0 ? Math.round((checked / total) * 100) : 0
                          return `${checked}/${total} (${percentage}%)`
                        })()}
                      </span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${
                      selectedList?.id === list.id ? 'bg-white/20' : 'bg-gray-200'
                    }`}>
                      <div
                        className={`h-full transition-all duration-300 ${
                          selectedList?.id === list.id ? 'bg-white' : 'bg-primary'
                        }`}
                        style={{
                          width: `${(() => {
                            const items = itemsByList.get(list.id) || []
                            const checked = items.filter((i: ShoppingListItem) => i.checked).length
                            const total = items.length
                            return total > 0 ? (checked / total) * 100 : 0
                          })()}%`
                        }}
                      />
                    </div>
                  </div>

                  {list.warnings && list.warnings.length > 0 && (
                    <div className="flex items-center gap-1 text-xs mt-2">
                      <span>⚠️</span>
                      <span className={selectedList?.id === list.id ? 'text-white/80' : 'text-orange-600'}>
                        {list.warnings.length} varning{list.warnings.length !== 1 ? 'ar' : ''}
                      </span>
                    </div>
                  )}
                </button>

                {/* Delete button - shows on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`Ta bort inköpslistan "${list.name}"?`)) {
                      deleteList(list.id)
                    }
                  }}
                  className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110 flex items-center justify-center text-xs shadow-lg z-10 border-2 border-white"
                  title="Ta bort lista"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </div>

          {/* Main content - Selected list */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedList ? (
                <motion.div
                  key={selectedList.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ShoppingListView
                    list={selectedList}
                    items={listItems}
                    onCheckItem={checkItem}
                    onUpdateItem={updateItem}
                    onDeleteItem={handleDeleteItem}
                    onMarkComplete={handleMarkComplete}
                    onExport={handleExport}
                    onDelete={handleDeleteList}
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-surface rounded-2xl"
                >
                  <div className="text-5xl mb-4">👈</div>
                  <p className="text-text-secondary">
                    Välj en inköpslista från listan
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Creator wizard */}
      <ShoppingListCreatorWizard
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        mealPlans={mealPlans}
        recipes={recipes}
        userId={user.id}
        onComplete={handleCreatorComplete}
      />

      {/* Sync conflict dialog */}
      {syncConflicts && (
        <SyncConflictDialog
          conflicts={syncConflicts.conflicts}
          onResolve={async (keepPurchased) => {
            const success = await regenerateList(selectedList?.id, keepPurchased)
            if (success) {
              setSyncConflicts(null)
              alert(keepPurchased
                ? '✅ Listan synkad! Inhandlade varor är bevarade.'
                : '✅ Listan regenererad från planeringen!'
              )
            } else {
              alert('❌ Kunde inte synka listan. Försök igen.')
            }
          }}
          onCancel={() => setSyncConflicts(null)}
        />
      )}
    </div>
  )
}
