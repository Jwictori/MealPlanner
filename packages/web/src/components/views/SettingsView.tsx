import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import { motion } from 'framer-motion'

interface UserPreferences {
  adults: number
  children: number
  diet_type: string
  allergies: string[]
  avoid_foods: string[]
  love_foods: string[]
  fitness_level: string
  fitness_goals: string
  protein_target: number
  cooking_skill: string
  weekday_time: string
  weekend_time: string
  meal_prep_willing: boolean
  budget_level: string
  weekly_food_budget: number
  cuisine_preferences: string[]
  spice_tolerance: string
  variety_preference: string
  locale: string
  unit_system: string
  temperature_unit: string
  auto_convert_recipes: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  adults: 2,
  children: 0,
  diet_type: 'omnivore',
  allergies: [],
  avoid_foods: [],
  love_foods: [],
  fitness_level: 'moderate',
  fitness_goals: 'maintenance',
  protein_target: 0,
  cooking_skill: 'intermediate',
  weekday_time: '30min',
  weekend_time: '60min',
  meal_prep_willing: false,
  budget_level: 'medium',
  weekly_food_budget: 0,
  cuisine_preferences: [],
  spice_tolerance: 'medium',
  variety_preference: 'medium',
  locale: 'sv-SE',
  unit_system: 'metric',
  temperature_unit: 'celsius',
  auto_convert_recipes: true,
}

export function SettingsView() {
  const { user, setCurrentView } = useStore()
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (user) loadPreferences()
  }, [user])

  const loadPreferences = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single()
      if (!error && data?.preferences) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...data.preferences })
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const savePreferences = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ preferences })
        .eq('id', user.id)
      if (!error) {
        setSaveMessage('✅ Inställningar sparade!')
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('❌ Fel vid sparande')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      setSaveMessage('❌ Fel vid sparande')
    } finally {
      setIsSaving(false)
    }
  }

  const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const addToArray = (key: keyof UserPreferences, value: string) => {
    const current = preferences[key] as string[]
    if (!current.includes(value)) {
      updatePref(key, [...current, value] as any)
    }
  }

  const removeFromArray = (key: keyof UserPreferences, value: string) => {
    const current = preferences[key] as string[]
    updatePref(key, current.filter(v => v !== value) as any)
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Logga in för att se inställningar</h2>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">Inställningar</h2>
        <p className="text-text-secondary">
          Anpassa appen efter dina behov. Ju mer du fyller i, desto bättre AI-förslag får du! 🤖
        </p>
      </div>

      <div className="space-y-6">
        <Section title="👨‍👩‍👧‍👦 Hushåll">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Antal vuxna">
              <input type="number" min="1" value={preferences.adults} onChange={(e) => updatePref('adults', parseInt(e.target.value))} className="input" />
            </Field>
            <Field label="Antal barn">
              <input type="number" min="0" value={preferences.children} onChange={(e) => updatePref('children', parseInt(e.target.value))} className="input" />
            </Field>
          </div>
        </Section>

        <Section title="🥗 Kosthållning">
          <Field label="Kosttyp">
            <select value={preferences.diet_type} onChange={(e) => updatePref('diet_type', e.target.value)} className="input">
              <option value="omnivore">Allätare</option>
              <option value="pescatarian">Pescetarian</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
            </select>
          </Field>
          <TagInput label="Allergier" values={preferences.allergies} onAdd={(v) => addToArray('allergies', v)} onRemove={(v) => removeFromArray('allergies', v)} placeholder="T.ex. laktos, gluten" />
          <TagInput label="Favoriter" values={preferences.love_foods} onAdd={(v) => addToArray('love_foods', v)} onRemove={(v) => removeFromArray('love_foods', v)} placeholder="T.ex. pasta, lax" />
        </Section>

        <Section title="🏋️ Träning">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Aktivitetsnivå">
              <select value={preferences.fitness_level} onChange={(e) => updatePref('fitness_level', e.target.value)} className="input">
                <option value="sedentary">Stillasittande</option>
                <option value="light">Lätt aktiv</option>
                <option value="moderate">Måttligt aktiv</option>
                <option value="very_active">Mycket aktiv</option>
              </select>
            </Field>
            <Field label="Mål">
              <select value={preferences.fitness_goals} onChange={(e) => updatePref('fitness_goals', e.target.value)} className="input">
                <option value="maintenance">Underhålla</option>
                <option value="weight_loss">Gå ner</option>
                <option value="muscle_gain">Bygga muskler</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title="⏰ Tid & Kunskap">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Matlagningsnivå">
              <select value={preferences.cooking_skill} onChange={(e) => updatePref('cooking_skill', e.target.value)} className="input">
                <option value="beginner">Nybörjare</option>
                <option value="intermediate">Medel</option>
                <option value="advanced">Avancerad</option>
              </select>
            </Field>
            <Field label="Tid vardagar">
              <select value={preferences.weekday_time} onChange={(e) => updatePref('weekday_time', e.target.value)} className="input">
                <option value="15min">15 min</option>
                <option value="30min">30 min</option>
                <option value="45min">45 min</option>
                <option value="60min+">60+ min</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title="🌍 Enheter">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Måttsystem">
              <select value={preferences.unit_system} onChange={(e) => updatePref('unit_system', e.target.value)} className="input">
                <option value="metric">Metriskt (dl, g)</option>
                <option value="imperial">Imperial (cups, oz)</option>
              </select>
            </Field>
            <Field label="Temperatur">
              <select value={preferences.temperature_unit} onChange={(e) => updatePref('temperature_unit', e.target.value)} className="input">
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* Admin Section */}
        <Section title="🔧 Utvecklare">
          <p className="text-sm text-text-secondary mb-4">
            Avancerade verktyg för att hantera receptimport och AI-regler.
          </p>
          <button
            onClick={() => setCurrentView('admin')}
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-text rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>🛠️</span>
            <span>Öppna Admin-panel</span>
          </button>
        </Section>

        <div className="sticky bottom-4 bg-surface border-2 border-primary rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            {saveMessage && <p className="text-sm font-semibold">{saveMessage}</p>}
            <button onClick={savePreferences} disabled={isSaving} className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all disabled:opacity-50 ml-auto">
              {isSaving ? 'Sparar...' : 'Spara'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface rounded-2xl p-6 border border-gray-200">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      {children}
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      {children}
    </div>
  )
}

function TagInput({ label, values, onAdd, onRemove, placeholder }: { label: string; values: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; placeholder: string }) {
  const [input, setInput] = useState('')
  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim())
      setInput('')
    }
  }
  return (
    <div className="mt-4">
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <div className="flex gap-2 mb-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())} className="input flex-1" placeholder={placeholder} />
        <button type="button" onClick={handleAdd} className="px-4 py-2 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary-dark">+</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <span key={v} className="px-3 py-1 bg-primary-light text-primary rounded-lg text-sm font-semibold flex items-center gap-2">
            {v}
            <button type="button" onClick={() => onRemove(v)}>✕</button>
          </span>
        ))}
      </div>
    </div>
  )
}
