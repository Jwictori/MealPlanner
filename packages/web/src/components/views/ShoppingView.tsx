import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import { ShoppingListView } from '../ShoppingListView'
import { ShoppingListCreatorWizard } from '../ShoppingListCreatorWizard'
import { ShoppingListSyncManager } from '../../lib/shoppingListSyncManager'
import { SyncConflictDialog } from '../SyncConflictDialog'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import type { ShoppingList, ShoppingListItem } from '@shared/shoppingListTypes'

export function ShoppingView() {
  const { user, recipes, mealPlans } = useStore()
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([])
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null)
  const [listItems, setListItems] = useState<ShoppingListItem[]>([])
  const [isCreatorOpen, setIsCreatorOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Sync state
  const [needsSync, setNeedsSync] = useState(false)
  const [syncConflicts, setSyncConflicts] = useState<any>(null)
  const lastMealPlanSnapshots = useRef<Map<string, string>>(new Map())
  
  // Group items by list for sidebar progress
  const itemsByList = useMemo(() => {
    if (selectedList && listItems.length > 0) {
      const map = new Map<string, ShoppingListItem[]>()
      map.set(selectedList.id, listItems)
      return map
    }
    return new Map<string, ShoppingListItem[]>()
  }, [selectedList, listItems])

  useEffect(() => {
    if (user) {
      loadShoppingLists()
    }
  }, [user])

  useEffect(() => {
    if (selectedList) {
      loadListItems(selectedList.id)
    }
  }, [selectedList])
  
  // Debug: Log when mealPlans changes
  useEffect(() => {
    console.log('🔄 mealPlans array changed:', {
      count: mealPlans.length,
      timestamp: new Date().toISOString(),
      plans: mealPlans.map(mp => ({ date: mp.date, recipe_id: mp.recipe_id }))
    })
  }, [mealPlans])
  
  // Detect meal plan changes for sync
  useEffect(() => {
    console.log('🔍 Sync detection triggered', {
      hasSelectedList: !!selectedList,
      mealPlansCount: mealPlans.length,
      selectedListId: selectedList?.id,
      selectedListName: selectedList?.name
    })
    
    if (!selectedList) {
      console.log('⏭️ Skipping: no selected list (but keeping snapshots)')
      return // Don't clear snapshots when navigating away!
    }
    
    if (!mealPlans.length) {
      console.log('⏭️ Skipping: no meal plans')
      return
    }
    
    const listId = selectedList.id
    
    const filteredMealPlans = mealPlans.filter(mp => {
      const date = new Date(mp.date)
      const listStart = new Date(selectedList.date_range_start)
      const listEnd = new Date(selectedList.date_range_end)
      return date >= listStart && date <= listEnd
    })
    
    console.log('📊 Filtered meal plans for list:', {
      listName: selectedList.name,
      dateRange: `${selectedList.date_range_start} to ${selectedList.date_range_end}`,
      filteredCount: filteredMealPlans.length,
      meals: filteredMealPlans.map(mp => ({ date: mp.date, recipe_id: mp.recipe_id }))
    })
    
    const currentSnapshot = JSON.stringify(
      filteredMealPlans
        .map(mp => ({ date: mp.date, recipe_id: mp.recipe_id }))
        .sort((a, b) => a.date.localeCompare(b.date))
    )
    
    // Get the last snapshot for THIS specific list
    const lastSnapshot = lastMealPlanSnapshots.current.get(listId)
    
    console.log('💾 Snapshot comparison:', {
      listId,
      hasLastSnapshot: !!lastSnapshot,
      snapshotsInMap: lastMealPlanSnapshots.current.size,
      currentSnapshot: currentSnapshot.substring(0, 100) + '...',
      lastSnapshot: lastSnapshot ? lastSnapshot.substring(0, 100) + '...' : 'none',
      areEqual: lastSnapshot === currentSnapshot
    })
    
    // Only trigger sync if we had a previous snapshot for THIS list AND it changed
    if (lastSnapshot && lastSnapshot !== currentSnapshot) {
      console.log('🔄 MEAL PLAN CHANGED for list:', selectedList.name)
      console.log('Old:', lastSnapshot)
      console.log('New:', currentSnapshot)
      setNeedsSync(true)
    } else if (lastSnapshot) {
      console.log('✅ No changes for list:', selectedList.name)
      setNeedsSync(false) // Reset sync flag when no changes
    } else {
      console.log('📝 First load of list:', selectedList.name)
      setNeedsSync(false) // No sync needed on first load
    }
    
    // Update the snapshot for this specific list
    lastMealPlanSnapshots.current.set(listId, currentSnapshot)
    console.log('💾 Updated snapshot map, now has', lastMealPlanSnapshots.current.size, 'entries')
  }, [mealPlans, selectedList?.id])

  const loadShoppingLists = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setShoppingLists(data as ShoppingList[])
        
        // Auto-select first active list
        const activeList = data.find(list => list.status === 'active')
        if (activeList && !selectedList) {
          setSelectedList(activeList as ShoppingList)
        }
      }
    } catch (error) {
      console.error('Error loading shopping lists:', error)
    } finally {
      setLoading(false)
    }
  }

const loadListItems = useCallback(async (listId: string) => {
  try {
    console.log('📥 Loading items for list:', listId)
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('shopping_list_id', listId)
      .order('created_at', { ascending: true })
    
    if (!error && data) {
      console.log('✅ Loaded', data.length, 'items')
      console.log('📋 Items data:', data)  // ← LÄGG TILL DENNA
      setListItems(data as ShoppingListItem[])
    }
  } catch (error) {
    console.error('Error loading list items:', error)
  }
}, [])

// LÄGG TILL DETTA USEEFFECT FÖR ATT SE STATE:
useEffect(() => {
  console.log('🔄 listItems state updated:', {
    count: listItems.length,
    items: listItems.map(i => i.ingredient_name)
  })
}, [listItems])

  useEffect(() => {
    if (!selectedList) return

    console.log('📡 Setting up realtime subscription for list:', selectedList.id)

    const channel = supabase
      .channel(`shopping_list_items:${selectedList.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list_items',
          filter: `shopping_list_id=eq.${selectedList.id}`
        },
        (payload) => {
          console.log('🔔 Shopping list items changed!', payload)
          // Reload items
          loadListItems(selectedList.id)
        }
      )
      .subscribe()

    return () => {
      console.log('📡 Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [selectedList?.id])

  const handleCheckItem = async (itemId: string, checked: boolean) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ checked })
        .eq('id', itemId)
      
      if (!error) {
        setListItems(prev => 
          prev.map(item => 
            item.id === itemId ? { ...item, checked } : item
          )
        )
      }
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const handleUpdateItem = async (itemId: string, updates: Partial<ShoppingListItem>) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update(updates)
        .eq('id', itemId)
      
      if (!error) {
        setListItems(prev => 
          prev.map(item => 
            item.id === itemId ? { ...item, ...updates } : item
          )
        )
      }
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Ta bort denna vara från listan?')) return
    
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', itemId)
      
      if (!error) {
        setListItems(prev => prev.filter(item => item.id !== itemId))
      }
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleMarkComplete = async () => {
    if (!selectedList) return
    
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ status: 'completed' })
        .eq('id', selectedList.id)
      
      if (!error) {
        await loadShoppingLists()
        setSelectedList(null)
      }
    } catch (error) {
      console.error('Error marking list complete:', error)
    }
  }

  const handleDeleteList = async () => {
    if (!selectedList) return
    if (!confirm('Ta bort hela inköpslistan?')) return
    
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', selectedList.id)
      
      if (!error) {
        await loadShoppingLists()
        setSelectedList(null)
      }
    } catch (error) {
      console.error('Error deleting list:', error)
    }
  }

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
      console.error('❌ No user!')
      return
    }
    
    console.log('🎯 handleCreatorComplete called with:', generatedLists)

    try {
      for (const list of generatedLists) {
        console.log('➕ Creating list:', list.name)
        
        // 1. Create shopping list (empty items array in JSONB)
        const { data: listData, error: listError } = await supabase
          .from('shopping_lists')
          .insert({
            user_id: list.user_id,
            name: list.name,
            date_range_start: list.date_range_start,
            date_range_end: list.date_range_end,
            status: list.status || 'active',
            split_mode: list.split_mode || 'single',
            warnings: list.warnings || [],
            items: []  // ← Keep empty, items go in separate table!
          })
          .select()
          .single()

        if (listError || !listData) {
          console.error('❌ Failed to create list:', listError)
          continue
        }

        console.log('✅ Created shopping list:', listData)

        // 2. Use database function to generate items with proper aggregation
        // This handles canonical matching, unit conversion, and "efter smak" grouping
        const { data: regenerateResult, error: regenerateError } = await supabase
          .rpc('regenerate_shopping_list', { target_list_id: listData.id })

        if (regenerateError) {
          console.error('❌ Error generating items:', regenerateError)
        } else {
          console.log('✅ Items generated:', regenerateResult)
        }
      }

      // 5. Reload
      console.log('🔄 Reloading shopping lists...')
      await loadShoppingLists()
      console.log('✅ Done!')
      
      setIsCreatorOpen(false)
    } catch (error) {
      console.error('❌ Error:', error)
    }
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
      await regenerateList(true)
    }
  }
  
  const regenerateList = async (keepPurchased: boolean) => {
    if (!selectedList || !user) return

    try {
      // Save checked items if keepPurchased is true
      const checkedIngredients = keepPurchased
        ? listItems.filter(item => item.checked).map(item => item.ingredient_name.toLowerCase())
        : []

      // Use database function for proper aggregation with canonical matching
      const { data, error } = await supabase
        .rpc('regenerate_shopping_list', { target_list_id: selectedList.id })

      if (error) {
        throw error
      }

      console.log('✅ List regenerated:', data)

      // Restore checked status for previously purchased items
      if (keepPurchased && checkedIngredients.length > 0) {
        // Get the new items
        const { data: newItems } = await supabase
          .from('shopping_list_items')
          .select('id, ingredient_name')
          .eq('shopping_list_id', selectedList.id)

        if (newItems) {
          // Find items that were previously checked
          const itemsToCheck = newItems.filter(item =>
            checkedIngredients.includes(item.ingredient_name.toLowerCase())
          )

          // Mark them as checked
          if (itemsToCheck.length > 0) {
            await supabase
              .from('shopping_list_items')
              .update({ checked: true })
              .in('id', itemsToCheck.map(i => i.id))
          }
        }
      }

      await loadListItems(selectedList.id)
      setNeedsSync(false)
      setSyncConflicts(null)

      alert(keepPurchased
        ? '✅ Listan synkad! Inhandlade varor är bevarade.'
        : '✅ Listan regenererad från planeringen!'
      )
    } catch (error) {
      console.error('Error syncing list:', error)
      alert('❌ Kunde inte synka listan. Försök igen.')
    }
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
                          const listItems = itemsByList.get(list.id) || []
                          const checked = listItems.filter((i: ShoppingListItem) => i.checked).length
                          const total = listItems.length
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
                            const listItems = itemsByList.get(list.id) || []
                            const checked = listItems.filter((i: ShoppingListItem) => i.checked).length
                            const total = listItems.length
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
              
              {/* Delete button - shows on hover with better positioning */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm(`Ta bort inköpslistan "${list.name}"?`)) {
                    setSelectedList(list)
                    handleDeleteList()
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
                    onCheckItem={handleCheckItem}
                    onUpdateItem={handleUpdateItem}
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
            await regenerateList(keepPurchased)
          }}
          onCancel={() => setSyncConflicts(null)}
        />
      )}
    </div>
  )
}