import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import { useAuth, useDebug } from '../../contexts'
import type { DebugSettings } from '../../contexts'

type AdminTab = 'extraction' | 'debug' | 'users'

interface SiteExtractionRule {
  id: string
  domain: string
  status: 'pending' | 'active' | 'deprecated' | 'needs_review'
  confidence_score: number
  extraction_rules: Record<string, unknown>
  sample_urls: string[]
  sample_schema_org: Record<string, unknown> | null
  times_used: number
  last_used_at: string | null
  total_imports: number
  positive_feedback: number
  negative_feedback: number
  success_rate: number
  ai_model_used: string | null
  ai_prompt_version: string | null
  created_at: string
  updated_at: string
}

interface FeedbackSummary {
  domain: string
  total: number
  positive: number
  negative: number
  issues: Record<string, number>
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  active: 'bg-green-100 text-green-800 border-green-300',
  deprecated: 'bg-gray-100 text-gray-800 border-gray-300',
  needs_review: 'bg-red-100 text-red-800 border-red-300',
}

const STATUS_LABELS = {
  pending: 'Väntande',
  active: 'Aktiv',
  deprecated: 'Utfasad',
  needs_review: 'Behöver granskning',
}

export function AdminView() {
  const { setCurrentView } = useStore()
  const { user } = useAuth()
  const { settings, isDebugAvailable, updateSetting, resetToDefaults, toggleAllOff } = useDebug()

  const [activeTab, setActiveTab] = useState<AdminTab>('extraction')
  const [rules, setRules] = useState<SiteExtractionRule[]>([])
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRule, setSelectedRule] = useState<SiteExtractionRule | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'extraction') {
      loadData()
    }
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      // Load extraction rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('site_extraction_rules')
        .select('*')
        .order('total_imports', { ascending: false })

      if (rulesError) throw rulesError
      setRules(rulesData || [])

      // Load feedback summary grouped by domain
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('recipe_import_feedback')
        .select('domain, feedback, issue_category')

      if (feedbackError) throw feedbackError

      // Aggregate feedback by domain
      const summary: Record<string, FeedbackSummary> = {}
      for (const fb of feedbackData || []) {
        if (!summary[fb.domain]) {
          summary[fb.domain] = { domain: fb.domain, total: 0, positive: 0, negative: 0, issues: {} }
        }
        summary[fb.domain].total++
        if (fb.feedback === 'thumbs_up') {
          summary[fb.domain].positive++
        } else {
          summary[fb.domain].negative++
          if (fb.issue_category) {
            summary[fb.domain].issues[fb.issue_category] = (summary[fb.domain].issues[fb.issue_category] || 0) + 1
          }
        }
      }
      setFeedbackSummary(Object.values(summary))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda data')
    } finally {
      setLoading(false)
    }
  }

  const updateRuleStatus = async (ruleId: string, newStatus: SiteExtractionRule['status']) => {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('site_extraction_rules')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ruleId)

      if (error) throw error

      // Update local state
      setRules(rules.map(r => r.id === ruleId ? { ...r, status: newStatus } : r))
      if (selectedRule?.id === ruleId) {
        setSelectedRule({ ...selectedRule, status: newStatus })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte uppdatera status')
    } finally {
      setActionLoading(false)
    }
  }

  const triggerReanalysis = async (domain: string) => {
    setActionLoading(true)
    try {
      // Mark as needs_review to trigger re-analysis on next import
      const { error } = await supabase
        .from('site_extraction_rules')
        .update({ status: 'needs_review', updated_at: new Date().toISOString() })
        .eq('domain', domain)

      if (error) throw error

      // Reload data
      await loadData()
      alert(`Domänen ${domain} är nu markerad för omanalys. Nästa import från denna sida kommer använda AI.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte trigga omanalys')
    } finally {
      setActionLoading(false)
    }
  }

  const deleteRule = async (ruleId: string, domain: string) => {
    if (!confirm(`Är du säker på att du vill ta bort reglerna för ${domain}?`)) return

    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('site_extraction_rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error

      setRules(rules.filter(r => r.id !== ruleId))
      setSelectedRule(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort regel')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Laddar admin-data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => setCurrentView('settings')}
            className="text-sm text-primary hover:text-primary-dark mb-2 flex items-center gap-1"
          >
            ← Tillbaka till inställningar
          </button>
          <h2 className="text-3xl font-bold">Admin-panel</h2>
          <p className="text-text-secondary">
            {user?.email} ({user?.role})
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('extraction')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'extraction'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text'
          }`}
        >
          Extraktionsregler
        </button>
        <button
          onClick={() => setActiveTab('debug')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'debug'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text'
          }`}
        >
          Debug & Utveckling
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text'
          }`}
        >
          Användare
        </button>
      </div>

      {/* Debug Tab Content */}
      {activeTab === 'debug' && (
        <div className="space-y-6">
          {!isDebugAvailable ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <p className="text-amber-800">
                Debug-läge är endast tillgängligt i utvecklingsmiljö för administratörer.
              </p>
            </div>
          ) : (
            <>
              {/* Debug Status */}
              <div className="bg-surface rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Debug-inställningar</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={resetToDefaults}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Återställ
                    </button>
                    <button
                      onClick={toggleAllOff}
                      className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      Stäng av alla
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Logging */}
                  <DebugToggle
                    label="Console-loggning"
                    description="Visa console.log meddelanden"
                    enabled={settings.enableConsoleLog}
                    onChange={(v) => updateSetting('enableConsoleLog', v)}
                  />
                  <DebugToggle
                    label="Prestandaloggning"
                    description="Visa timing och prestanda-data"
                    enabled={settings.enablePerformanceLog}
                    onChange={(v) => updateSetting('enablePerformanceLog', v)}
                  />
                  <DebugToggle
                    label="API-anrop loggning"
                    description="Logga alla Supabase API-anrop"
                    enabled={settings.logApiCalls}
                    onChange={(v) => updateSetting('logApiCalls', v)}
                  />

                  {/* Mock Data */}
                  <DebugToggle
                    label="Mock AI-svar"
                    description="Använd förinställda AI-svar istället för riktiga API-anrop"
                    enabled={settings.useMockAI}
                    onChange={(v) => updateSetting('useMockAI', v)}
                    highlight
                  />
                  <DebugToggle
                    label="Mock-recept"
                    description="Använd testrecept"
                    enabled={settings.useMockRecipes}
                    onChange={(v) => updateSetting('useMockRecipes', v)}
                  />

                  {/* UI Debug */}
                  <DebugToggle
                    label="Komponentgränser"
                    description="Visa visuella gränser för komponenter"
                    enabled={settings.showComponentBorders}
                    onChange={(v) => updateSetting('showComponentBorders', v)}
                  />
                  <DebugToggle
                    label="Render-räknare"
                    description="Visa antal omrenderingar"
                    enabled={settings.showRenderCounts}
                    onChange={(v) => updateSetting('showRenderCounts', v)}
                  />

                  {/* Features */}
                  <DebugToggle
                    label="Experimentella funktioner"
                    description="Aktivera funktioner under utveckling"
                    enabled={settings.enableExperimentalFeatures}
                    onChange={(v) => updateSetting('enableExperimentalFeatures', v)}
                  />
                </div>
              </div>

              {/* Current Settings JSON */}
              <div className="bg-surface rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold mb-3">Aktuella inställningar (JSON)</h3>
                <pre className="text-xs bg-gray-100 rounded-lg p-4 overflow-auto">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      )}

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div className="bg-surface rounded-xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-4">Användarhantering</h3>
          <p className="text-text-secondary">
            Kommer snart: Lista användare, ändra roller, hantera prenumerationer.
          </p>
        </div>
      )}

      {/* Extraction Rules Tab Content */}
      {activeTab === 'extraction' && (
        <>
          {/* Refresh button for extraction tab */}
          <div className="flex justify-end mb-4">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark disabled:opacity-50"
            >
              Uppdatera
            </button>
          </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Totalt domäner"
          value={rules.length}
          icon="🌐"
        />
        <StatCard
          label="Aktiva regler"
          value={rules.filter(r => r.status === 'active').length}
          icon="✅"
          color="text-green-600"
        />
        <StatCard
          label="Behöver granskning"
          value={rules.filter(r => r.status === 'needs_review').length}
          icon="⚠️"
          color="text-amber-600"
        />
        <StatCard
          label="Total feedback"
          value={feedbackSummary.reduce((acc, s) => acc + s.total, 0)}
          icon="📊"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-bold">Domänregler</h3>

          {rules.length === 0 ? (
            <div className="bg-surface rounded-xl p-8 text-center border border-gray-200">
              <p className="text-text-secondary">Inga extraktionsregler ännu.</p>
              <p className="text-sm text-text-secondary mt-2">
                Regler skapas automatiskt när recept importeras från nya domäner.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-surface rounded-xl p-4 border cursor-pointer transition-all ${
                    selectedRule?.id === rule.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedRule(rule)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-lg">{rule.domain}</h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_COLORS[rule.status]}`}>
                          {STATUS_LABELS[rule.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                        <span>📥 {rule.total_imports} importer</span>
                        <span>👍 {rule.positive_feedback}</span>
                        <span>👎 {rule.negative_feedback}</span>
                        <span className={rule.success_rate >= 70 ? 'text-green-600' : 'text-red-600'}>
                          📈 {rule.success_rate?.toFixed(0) || 0}% framgång
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-text-secondary">
                      <div>Konfidens: {rule.confidence_score}%</div>
                      {rule.last_used_at && (
                        <div>Senast: {new Date(rule.last_used_at).toLocaleDateString('sv-SE')}</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold mb-4">Detaljer</h3>

          {selectedRule ? (
            <div className="bg-surface rounded-xl p-4 border border-gray-200 space-y-4">
              <div>
                <h4 className="font-bold text-lg mb-1">{selectedRule.domain}</h4>
                <p className="text-xs text-text-secondary">
                  Skapad: {new Date(selectedRule.created_at).toLocaleString('sv-SE')}
                </p>
              </div>

              {/* Status Actions */}
              <div>
                <label className="block text-sm font-semibold mb-2">Ändra status</label>
                <div className="flex flex-wrap gap-2">
                  {(['active', 'pending', 'needs_review', 'deprecated'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateRuleStatus(selectedRule.id, status)}
                      disabled={actionLoading || selectedRule.status === status}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors disabled:opacity-50 ${
                        selectedRule.status === status
                          ? STATUS_COLORS[status]
                          : 'bg-white hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Info */}
              {selectedRule.ai_model_used && (
                <div>
                  <label className="block text-sm font-semibold mb-1">AI-modell</label>
                  <p className="text-sm text-text-secondary">{selectedRule.ai_model_used}</p>
                </div>
              )}

              {/* Sample URLs */}
              {selectedRule.sample_urls && selectedRule.sample_urls.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Exempel-URLs</label>
                  <div className="space-y-1">
                    {selectedRule.sample_urls.slice(0, 3).map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-primary hover:underline truncate"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Extraction Rules Preview */}
              <div>
                <label className="block text-sm font-semibold mb-1">Extraktionsregler</label>
                <pre className="text-xs bg-gray-100 rounded-lg p-3 overflow-auto max-h-48">
                  {JSON.stringify(selectedRule.extraction_rules, null, 2)}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => triggerReanalysis(selectedRule.domain)}
                  disabled={actionLoading}
                  className="flex-1 px-3 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  🔄 Omanalysera
                </button>
                <button
                  onClick={() => deleteRule(selectedRule.id, selectedRule.domain)}
                  disabled={actionLoading}
                  className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  🗑️
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-surface rounded-xl p-8 border border-gray-200 text-center">
              <p className="text-text-secondary">Välj en domän för att se detaljer</p>
            </div>
          )}

          {/* Feedback Summary */}
          {feedbackSummary.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-bold mb-4">Feedback per domän</h3>
              <div className="bg-surface rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Domän</th>
                      <th className="px-3 py-2 text-center font-semibold">👍</th>
                      <th className="px-3 py-2 text-center font-semibold">👎</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {feedbackSummary.slice(0, 10).map((fb) => (
                      <tr key={fb.domain} className="hover:bg-gray-50">
                        <td className="px-3 py-2 truncate max-w-[120px]" title={fb.domain}>
                          {fb.domain}
                        </td>
                        <td className="px-3 py-2 text-center text-green-600">{fb.positive}</td>
                        <td className="px-3 py-2 text-center text-red-600">{fb.negative}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  )
}

// Debug Toggle Component
function DebugToggle({
  label,
  description,
  enabled,
  onChange,
  highlight = false,
}: {
  label: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
  highlight?: boolean
}) {
  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        highlight && enabled
          ? 'bg-amber-50 border-amber-200'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{label}</h4>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
        <button
          onClick={() => onChange(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-primary' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color = 'text-text' }: { label: string; value: number; icon: string; color?: string }) {
  return (
    <div className="bg-surface rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-text-secondary">{label}</p>
        </div>
      </div>
    </div>
  )
}
