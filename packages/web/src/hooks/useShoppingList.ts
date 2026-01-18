import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { ShoppingList, ShoppingListItem } from '@shared/shoppingListTypes'
import type { MealPlan, Recipe } from '@shared/types'

interface UseShoppingListOptions {
  userId: string | undefined
  mealPlans?: MealPlan[]
  recipes?: Recipe[]
  autoLoad?: boolean
}

interface CreateListParams {
  name: string
  date_range_start: string
  date_range_end: string
  status?: 'active' | 'completed' | 'archived'
  split_mode?: 'single' | 'split'
  warnings?: any[]
}

export function useShoppingList({
  userId,
  mealPlans = [],
  recipes: _recipes = [], // Reserved for future client-side use
  autoLoad = true
}: UseShoppingListOptions) {
  // State
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([])
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null)
  const [listItems, setListItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [needsSync, setNeedsSync] = useState(false)

  // Refs for sync detection
  const lastMealPlanSnapshots = useRef<Map<string, string>>(new Map())

  // Group items by list for progress tracking
  const itemsByList = useMemo(() => {
    if (selectedList && listItems.length > 0) {
      const map = new Map<string, ShoppingListItem[]>()
      map.set(selectedList.id, listItems)
      return map
    }
    return new Map<string, ShoppingListItem[]>()
  }, [selectedList, listItems])

  // ============================================
  // LOAD FUNCTIONS
  // ============================================

  const loadShoppingLists = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setShoppingLists(data as ShoppingList[])

        // Auto-select first active list if none selected
        const activeList = data.find(list => list.status === 'active')
        if (activeList && !selectedList) {
          setSelectedList(activeList as ShoppingList)
        }
      }
    } catch (error) {
      console.error('[useShoppingList] Error loading shopping lists:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, selectedList])

  const loadListItems = useCallback(async (listId: string) => {
    try {
      console.log('[useShoppingList] Loading items for list:', listId)
      const { data, error } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('shopping_list_id', listId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        console.log('[useShoppingList] Loaded', data.length, 'items')
        setListItems(data as ShoppingListItem[])
      }
    } catch (error) {
      console.error('[useShoppingList] Error loading list items:', error)
    }
  }, [])

  // ============================================
  // CREATE FUNCTION (using database RPC)
  // ============================================

  const createShoppingList = useCallback(async (params: CreateListParams): Promise<ShoppingList | null> => {
    if (!userId) {
      console.error('[useShoppingList] No user ID')
      return null
    }

    try {
      console.log('[useShoppingList] Creating list:', params.name)

      // 1. Create shopping list (empty items array in JSONB)
      const { data: listData, error: listError } = await supabase
        .from('shopping_lists')
        .insert({
          user_id: userId,
          name: params.name,
          date_range_start: params.date_range_start,
          date_range_end: params.date_range_end,
          status: params.status || 'active',
          split_mode: params.split_mode || 'single',
          warnings: params.warnings || [],
          items: [] // Keep empty, items go in separate table!
        })
        .select()
        .single()

      if (listError || !listData) {
        console.error('[useShoppingList] Failed to create list:', listError)
        return null
      }

      console.log('[useShoppingList] Created shopping list:', listData.id)

      // 2. Use database function to generate items with proper aggregation
      // This handles canonical matching, unit conversion, and "efter smak" grouping
      const { data: regenerateResult, error: regenerateError } = await supabase
        .rpc('regenerate_shopping_list', { target_list_id: listData.id })

      if (regenerateError) {
        console.error('[useShoppingList] Error generating items:', regenerateError)
      } else {
        console.log('[useShoppingList] Items generated:', regenerateResult)
      }

      // 3. Reload lists
      await loadShoppingLists()

      return listData as ShoppingList
    } catch (error) {
      console.error('[useShoppingList] Error creating list:', error)
      return null
    }
  }, [userId, loadShoppingLists])

  // Batch create multiple lists (for wizard)
  const createShoppingLists = useCallback(async (lists: CreateListParams[]): Promise<boolean> => {
    try {
      for (const list of lists) {
        await createShoppingList(list)
      }
      return true
    } catch (error) {
      console.error('[useShoppingList] Error creating lists:', error)
      return false
    }
  }, [createShoppingList])

  // ============================================
  // ITEM CRUD
  // ============================================

  const checkItem = useCallback(async (itemId: string, checked: boolean) => {
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
      console.error('[useShoppingList] Error checking item:', error)
    }
  }, [])

  const updateItem = useCallback(async (itemId: string, updates: Partial<ShoppingListItem>) => {
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
      console.error('[useShoppingList] Error updating item:', error)
    }
  }, [])

  const deleteItem = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', itemId)

      if (!error) {
        setListItems(prev => prev.filter(item => item.id !== itemId))
      }
    } catch (error) {
      console.error('[useShoppingList] Error deleting item:', error)
    }
  }, [])

  // ============================================
  // LIST OPERATIONS
  // ============================================

  const markListComplete = useCallback(async (listId?: string) => {
    const targetId = listId || selectedList?.id
    if (!targetId) return

    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ status: 'completed' })
        .eq('id', targetId)

      if (!error) {
        await loadShoppingLists()
        if (targetId === selectedList?.id) {
          setSelectedList(null)
        }
      }
    } catch (error) {
      console.error('[useShoppingList] Error marking list complete:', error)
    }
  }, [selectedList, loadShoppingLists])

  const deleteList = useCallback(async (listId?: string) => {
    const targetId = listId || selectedList?.id
    if (!targetId) return

    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', targetId)

      if (!error) {
        await loadShoppingLists()
        if (targetId === selectedList?.id) {
          setSelectedList(null)
          setListItems([])
        }
      }
    } catch (error) {
      console.error('[useShoppingList] Error deleting list:', error)
    }
  }, [selectedList, loadShoppingLists])

  // ============================================
  // SYNC WITH MEAL PLANS
  // ============================================

  const regenerateList = useCallback(async (listId?: string, keepPurchased = true) => {
    const targetId = listId || selectedList?.id
    if (!targetId) return

    try {
      // Save checked items if keepPurchased is true
      const checkedIngredients = keepPurchased
        ? listItems.filter(item => item.checked).map(item => item.ingredient_name.toLowerCase())
        : []

      // Use database function for proper aggregation with canonical matching
      const { data, error } = await supabase
        .rpc('regenerate_shopping_list', { target_list_id: targetId })

      if (error) throw error

      console.log('[useShoppingList] List regenerated:', data)

      // Restore checked status for previously purchased items
      if (keepPurchased && checkedIngredients.length > 0) {
        const { data: newItems } = await supabase
          .from('shopping_list_items')
          .select('id, ingredient_name')
          .eq('shopping_list_id', targetId)

        if (newItems) {
          const itemsToCheck = newItems.filter(item =>
            checkedIngredients.includes(item.ingredient_name.toLowerCase())
          )

          if (itemsToCheck.length > 0) {
            await supabase
              .from('shopping_list_items')
              .update({ checked: true })
              .in('id', itemsToCheck.map(i => i.id))
          }
        }
      }

      await loadListItems(targetId)
      setNeedsSync(false)

      return true
    } catch (error) {
      console.error('[useShoppingList] Error regenerating list:', error)
      return false
    }
  }, [selectedList, listItems, loadListItems])

  // ============================================
  // EFFECTS
  // ============================================

  // Auto-load lists on mount
  useEffect(() => {
    if (userId && autoLoad) {
      loadShoppingLists()
    }
  }, [userId, autoLoad, loadShoppingLists])

  // Load items when selected list changes
  useEffect(() => {
    if (selectedList) {
      loadListItems(selectedList.id)
    } else {
      setListItems([])
    }
  }, [selectedList, loadListItems])

  // Realtime subscription for item changes
  useEffect(() => {
    if (!selectedList) return

    console.log('[useShoppingList] Setting up realtime subscription for list:', selectedList.id)

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
        () => {
          console.log('[useShoppingList] Realtime: items changed')
          loadListItems(selectedList.id)
        }
      )
      .subscribe()

    return () => {
      console.log('[useShoppingList] Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [selectedList?.id, loadListItems])

  // Detect meal plan changes for sync
  useEffect(() => {
    if (!selectedList || !mealPlans.length) {
      return
    }

    const listId = selectedList.id

    const filteredMealPlans = mealPlans.filter(mp => {
      const date = new Date(mp.date)
      const listStart = new Date(selectedList.date_range_start)
      const listEnd = new Date(selectedList.date_range_end)
      return date >= listStart && date <= listEnd
    })

    const currentSnapshot = JSON.stringify(
      filteredMealPlans
        .map(mp => ({ date: mp.date, recipe_id: mp.recipe_id }))
        .sort((a, b) => a.date.localeCompare(b.date))
    )

    const lastSnapshot = lastMealPlanSnapshots.current.get(listId)

    // Only trigger sync if we had a previous snapshot for THIS list AND it changed
    if (lastSnapshot && lastSnapshot !== currentSnapshot) {
      console.log('[useShoppingList] Meal plan changed for list:', selectedList.name)
      setNeedsSync(true)
    } else if (lastSnapshot) {
      setNeedsSync(false)
    }

    lastMealPlanSnapshots.current.set(listId, currentSnapshot)
  }, [mealPlans, selectedList?.id])

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    shoppingLists,
    selectedList,
    listItems,
    loading,
    needsSync,
    itemsByList,

    // Actions
    setSelectedList,
    loadShoppingLists,
    loadListItems,
    createShoppingList,
    createShoppingLists,

    // Item CRUD
    checkItem,
    updateItem,
    deleteItem,

    // List operations
    markListComplete,
    deleteList,
    regenerateList,
  }
}
