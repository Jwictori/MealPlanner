import { motion } from 'framer-motion'
import type { SyncConflict } from '../lib/shoppingListSyncManager'
import { ShoppingListSyncManager } from '../lib/shoppingListSyncManager'

interface SyncConflictDialogProps {
  conflicts: SyncConflict[]
  onResolve: (keepPurchased: boolean) => void
  onCancel: () => void
}

export function SyncConflictDialog({
  conflicts,
  onResolve,
  onCancel
}: SyncConflictDialogProps) {
  
  const removedWithPurchased = conflicts.filter(
    c => c.type === 'removed_recipe' && c.purchasedCount > 0
  )
  
  const totalPurchased = removedWithPurchased.reduce(
    (sum, c) => sum + c.purchasedCount, 0
  )
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">⚠️</span>
            <div>
              <h2 className="text-2xl font-bold">Matplaneringen har ändrats</h2>
              <p className="text-white/90 text-sm mt-1">
                Vi har upptäckt ändringar som påverkar din inköpslista
              </p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {/* Summary */}
          <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div className="flex-1">
                <p className="font-semibold text-orange-900 mb-2">
                  Sammanfattning av ändringar:
                </p>
                <ul className="space-y-1 text-sm text-orange-800">
                  {conflicts.filter(c => c.type === 'added_recipe').length > 0 && (
                    <li>
                      ✅ <strong>{conflicts.filter(c => c.type === 'added_recipe').length}</strong> recept tillagt
                    </li>
                  )}
                  {conflicts.filter(c => c.type === 'removed_recipe').length > 0 && (
                    <li>
                      ❌ <strong>{conflicts.filter(c => c.type === 'removed_recipe').length}</strong> recept borttaget
                    </li>
                  )}
                  {totalPurchased > 0 && (
                    <li className="text-red-700 font-medium">
                      🛒 <strong>{totalPurchased}</strong> vara{totalPurchased !== 1 ? 'or' : ''} redan inhandlad{totalPurchased !== 1 ? 'e' : ''} för borttagna recept
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Detailed conflicts */}
          <div className="space-y-3">
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 ${
                  conflict.type === 'removed_recipe' && conflict.purchasedCount > 0
                    ? 'bg-red-50 border-red-200'
                    : conflict.type === 'removed_recipe'
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {conflict.type === 'added_recipe' ? '➕' : '➖'}
                  </span>
                  <div className="flex-1">
                    <p className={`font-semibold mb-1 ${
                      conflict.type === 'removed_recipe' && conflict.purchasedCount > 0
                        ? 'text-red-900'
                        : conflict.type === 'removed_recipe'
                        ? 'text-gray-900'
                        : 'text-green-900'
                    }`}>
                      {ShoppingListSyncManager.getConflictMessage(conflict)}
                    </p>
                    <p className={`text-xs ${
                      conflict.type === 'removed_recipe' && conflict.purchasedCount > 0
                        ? 'text-red-700'
                        : conflict.type === 'removed_recipe'
                        ? 'text-gray-700'
                        : 'text-green-700'
                    }`}>
                      {ShoppingListSyncManager.getRecommendedAction(conflict)}
                    </p>
                    
                    {/* Show affected items if purchased */}
                    {conflict.purchasedCount > 0 && conflict.affectedItems.length > 0 && (
                      <div className="mt-2 p-2 bg-white/50 rounded border border-red-200">
                        <p className="text-xs font-medium text-red-900 mb-1">
                          Inhandlade varor:
                        </p>
                        <ul className="text-xs text-red-800 space-y-0.5">
                          {conflict.affectedItems
                            .filter(item => item.checked)
                            .slice(0, 3)
                            .map((item, i) => (
                              <li key={i}>• {item.ingredient_name} ({item.quantity} {item.unit})</li>
                            ))}
                          {conflict.affectedItems.filter(item => item.checked).length > 3 && (
                            <li className="text-red-600">
                              ... och {conflict.affectedItems.filter(item => item.checked).length - 3} till
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-6 bg-gray-50 border-t-2 border-gray-200">
          <p className="text-sm text-gray-700 mb-4">
            Vad vill du göra med redan inhandlade varor?
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onResolve(true)}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
            >
              ✅ Behåll inhandlade varor
              <span className="block text-xs opacity-80 mt-1">
                Uppdaterar listan men sparar det du redan köpt
              </span>
            </button>
            
            <button
              onClick={() => onResolve(false)}
              className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-all"
            >
              🔄 Generera om helt
              <span className="block text-xs opacity-80 mt-1">
                Tar bort allt och skapar ny lista från planeringen
              </span>
            </button>
          </div>
          
          <button
            onClick={onCancel}
            className="w-full mt-3 px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition-all"
          >
            Avbryt
          </button>
        </div>
      </motion.div>
    </div>
  )
}
