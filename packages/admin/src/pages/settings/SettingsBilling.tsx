import React from 'react'
import { CreditCard, Sparkles, PlusCircle, Trash, PlusCircle as PlusCircleIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SettingsBillingProps {
 activeSite: any
 setActiveSite: (s: any) => void
 healthData: any
 theme: 'light' | 'dark'
}

const SettingsBilling: React.FC<SettingsBillingProps> = ({ activeSite, setActiveSite, healthData, theme }) => {
 if (!activeSite) {
 return (
 <div className="col-span-1 md:col-span-2 space-y-8">
 <div
 className={cn(
 'p-8 rounded-none border text-center space-y-4 shadow-sm',
 theme === 'dark'
 ? 'bg-z-panel backdrop-blur-md border-z-border text-z-muted'
 : 'bg-z-input border-z-border shadow-sm text-z-secondary'
 )}
 >
 <CreditCard size={48} className="mx-auto text-gray-600 dark:text-z-secondary animate-pulse" />
 <h3 className="text-lg font-semibold">
 No Active Workspace Selected
 </h3>
 <p className="text-xs font-bold text-z-secondary max-w-md mx-auto">
 Select a site from the top-left sidebar switcher or workspace launchpad
 to configure pricing plans, paywalls, and subscription billing keys.
 </p>
 </div>
 </div>
 )
 }

 return (
 <div className="col-span-1 md:col-span-2 space-y-8">
 {/* Enable Billing Switcher */}
 <div
 className={cn(
 'p-6 rounded-none border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all group shadow-sm',
 theme === 'dark'
 ? 'bg-z-panel backdrop-blur-md border-z-border hover:border-z-active-border'
 : 'bg-z-panel border-z-border shadow-sm'
 )}
 >
 <div className="flex flex-col">
 <span className="text-sm font-semibold leading-none flex items-center gap-2">
 <Sparkles size={14} className="text-gray-600 dark:text-z-muted" />
 Enable Custom Pricing Plans & Monetization
 </span>
 <span className="text-sm text-z-secondary font-bold mt-1.5 leading-relaxed">
 Instantly deploy paywalls, premium plans, and check-out rules for client frontends
 </span>
 </div>
 <div className="flex items-center gap-4">
 <select
 value={activeSite.currency || 'USD'}
 onChange={(e) => setActiveSite({ ...activeSite, currency: e.target.value })}
 className={cn(
 'border rounded-none py-1.5 px-3 text-sm font-semibold  outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark' ? 'bg-black border-z-border text-white' : 'bg-z-panel border-z-border text-gray-800'
 )}
 >
 <option value="USD">USD ($)</option>
 <option value="EUR">EUR (€)</option>
 <option value="GBP">GBP (£)</option>
 <option value="AUD">AUD ($)</option>
 <option value="CAD">CAD ($)</option>
 </select>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={activeSite.billingEnabled || false}
 onChange={(e) => setActiveSite({ ...activeSite, billingEnabled: e.target.checked })}
 className="sr-only peer"
 />
 <div className={cn("w-12 h-6 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-none after:h-4 after:w-5 after:transition-all border shadow-inner", theme === 'dark' ? 'bg-black/80 border-z-border peer-checked:bg-z-accent' : 'bg-gray-200 peer-checked:bg-z-accent')}></div>
 </label>
 </div>
 </div>

 {activeSite.billingEnabled && (
 <>
 {/* Stripe Credentials */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {[
 { label: 'Stripe Publishable Key', placeholder: 'pk_test_...', field: 'stripePublicKey' },
 { label: 'Stripe Secret Key', placeholder: 'sk_test_...', field: 'stripeSecretKey' },
 { label: 'Stripe Webhook Secret', placeholder: 'whsec_...', field: 'stripeWebhookSecret' },
 ].map((input) => (
 <div
 key={input.field}
 className={cn(
 'p-4 rounded-none border transition-all space-y-3 shadow-sm',
 theme === 'dark' ? 'bg-z-panel backdrop-blur-md border-z-border' : 'bg-gray-50/50 border-z-border shadow-sm'
 )}
 >
 <label className="text-sm font-semibold text-z-muted px-1">
 {input.label}
 </label>
 <input
 type="password"
 placeholder={input.placeholder}
 value={activeSite[input.field] || ''}
 onChange={(e) => setActiveSite({ ...activeSite, [input.field]: e.target.value })}
 className={cn(
 'w-full border rounded-none py-3 px-4 text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark'
 ? 'bg-black border-z-border text-white focus:border-z-accent'
 : 'bg-z-panel border-z-border focus:border-z-accent'
 )}
 />
 </div>
 ))}
 </div>

 {/* Subscription Plans */}
 <div className="space-y-6">
 <div className="flex items-center justify-between border-b border-z-border pb-4">
 <div className="flex flex-col">
 <h3 className="text-sm font-semibold">
 Subscription Tiers & Paywalls
 </h3>
 <span className="text-sm text-z-secondary font-bold mt-1">
 Configure subscription plans, features list, and restrict collection access
 </span>
 </div>
 <button
 type="button"
 onClick={() => {
 const newPlan = {
 id: Date.now().toString(),
 name: 'Premium Subscription Plan',
 slug: 'premium-tier',
 price: 29,
 billingPeriod: 'monthly',
 features: ['All dynamic contents', 'Elite developer modules', 'SLA operational bounds'],
 isPopular: false,
 paywalledCollections: [],
 }
 setActiveSite({ ...activeSite, pricingPlans: [...(activeSite.pricingPlans || []), newPlan] })
 }}
 className="flex items-center gap-2 px-4 py-2 border border-z-active-border hover:border-z-accent hover:bg-z-active-bg text-sm font-semibold transition-all text-z-accent dark:text-z-active-text hover:text-white"
 >
 <PlusCircle size={12} />
 Add Plan
 </button>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
 {(activeSite.pricingPlans || []).map((plan: any, planIndex: number) => (
 <div
 key={plan.id || planIndex}
 className={cn(
 'p-6 border rounded-none relative transition-all flex flex-col justify-between space-y-6 shadow-sm',
 plan.isPopular
 ? theme === 'dark'
 ? 'bg-black/80 backdrop-blur-md border-z-active-border shadow-sm'
 : 'bg-z-active-bg border-z-active-border'
 : theme === 'dark'
 ? 'bg-z-panel backdrop-blur-md border-z-border'
 : 'bg-z-panel border-z-border shadow-sm'
 )}
 >
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <input
 type="text"
 value={plan.name}
 onChange={(e) => {
 const plans = [...activeSite.pricingPlans]
 plans[planIndex] = { ...plan, name: e.target.value }
 setActiveSite({ ...activeSite, pricingPlans: plans })
 }}
 className={cn(
 'text-sm font-semibold  outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black border-b border-transparent focus:border-z-accent bg-transparent w-full mr-4',
 theme === 'dark' ? 'text-white' : 'text-z-primary'
 )}
 />
 <button
 type="button"
 onClick={() => {
 const plans = activeSite.pricingPlans.filter((_: any, idx: number) => idx !== planIndex)
 setActiveSite({ ...activeSite, pricingPlans: plans })
 }}
 className="text-z-secondary hover:text-red-400 transition-colors shrink-0"
 >
 <Trash size={14} />
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-sm font-semibold text-z-secondary">Plan Slug</label>
 <input
 type="text"
 value={plan.slug}
 onChange={(e) => {
 const plans = [...activeSite.pricingPlans]
 plans[planIndex] = { ...plan, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }
 setActiveSite({ ...activeSite, pricingPlans: plans })
 }}
 className={cn(
 'w-full border rounded-none py-1.5 px-3 text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark' ? 'bg-black border-z-border text-white' : 'bg-z-panel border-z-border'
 )}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-semibold text-z-secondary">Pricing ({activeSite.currency || 'USD'})</label>
 <div className="flex items-center gap-1.5">
 <input
 type="number"
 value={plan.price}
 onChange={(e) => {
 const plans = [...activeSite.pricingPlans]
 plans[planIndex] = { ...plan, price: Number(e.target.value) }
 setActiveSite({ ...activeSite, pricingPlans: plans })
 }}
 className={cn(
 'w-full border rounded-none py-1.5 px-3 text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark' ? 'bg-black border-z-border text-white' : 'bg-z-panel border-z-border'
 )}
 />
 <select
 value={plan.billingPeriod || 'monthly'}
 onChange={(e) => {
 const plans = [...activeSite.pricingPlans]
 plans[planIndex] = { ...plan, billingPeriod: e.target.value }
 setActiveSite({ ...activeSite, pricingPlans: plans })
 }}
 className={cn(
 'border rounded-none py-1.5 px-2 text-sm font-semibold  outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark' ? 'bg-black border-z-border text-white' : 'bg-z-panel border-z-border'
 )}
 >
 <option value="monthly">/mo</option>
 <option value="yearly">/yr</option>
 <option value="one-time">once</option>
 </select>
 </div>
 </div>
 </div>

 {/* Paywalled Collections */}
 <div className="space-y-2">
 <label className="text-sm font-semibold text-z-secondary block">Paywall Restricted Collections</label>
 <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
 {(healthData?.collections || []).length === 0 ? (
 <div className="col-span-full py-4 text-center border border-dashed border-z-border dark:border-z-border rounded-none">
 <span className="text-sm font-semibold text-z-secondary">No collections available to monetize</span>
 </div>
 ) : (
 (healthData?.collections || []).map((col: any) => {
 const checked = (plan.paywalledCollections || []).includes(col.slug)
 return (
 <label key={col.slug} className="flex items-center gap-2 cursor-pointer group">
 <input
 type="checkbox"
 checked={checked}
 onChange={(e) => {
 const current = plan.paywalledCollections || []
 const next = e.target.checked ? [...current, col.slug] : current.filter((s: string) => s !== col.slug)
 const plans = [...activeSite.pricingPlans]
 plans[planIndex] = { ...plan, paywalledCollections: next }
 setActiveSite({ ...activeSite, pricingPlans: plans })
 }}
 className="rounded-none border-z-border text-z-accent focus:ring-0 focus:ring-offset-0 bg-black cursor-pointer"
 />
 <span className={cn(
 'text-sm font-semibold   transition-colors',
 checked ? 'text-gray-600 dark:text-z-muted' : 'text-z-secondary group-hover:text-z-muted'
 )}>
 {col.label || col.slug}
 </span>
 </label>
 )
 })
 )}
 </div>
 </div>

 {/* Features */}
 <div className="space-y-2">
 <label className="text-sm font-semibold text-z-secondary block">Plan Features & Deliverables</label>
 <div className="space-y-1.5">
 {(plan.features || []).map((feat: string, featIdx: number) => (
 <div key={featIdx} className="flex items-center gap-2">
 <span className="text-gray-600 dark:text-z-secondary text-sm font-semibold">•</span>
 <input
 type="text"
 value={feat}
 onChange={(e) => {
 const feats = [...plan.features]
 feats[featIdx] = e.target.value
 const plans = [...activeSite.pricingPlans]
 plans[planIndex] = { ...plan, features: feats }
 setActiveSite({ ...activeSite, pricingPlans: plans })
 }}
 className={cn(
 'flex-1 border-b border-transparent focus:border-z-border bg-transparent text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black py-0.5',
 theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
 )}
 />
 <button
 type="button"
 onClick={() => {
 const feats = plan.features.filter((_: any, idx: number) => idx !== featIdx)
 const plans = [...activeSite.pricingPlans]
 plans[planIndex] = { ...plan, features: feats }
 setActiveSite({ ...activeSite, pricingPlans: plans })
 }}
 className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
 >
 <Trash size={10} />
 </button>
 </div>
 ))}
 <button
 type="button"
 onClick={() => {
 const feats = [...(plan.features || []), 'Premium value deliverable']
 const plans = [...activeSite.pricingPlans]
 plans[planIndex] = { ...plan, features: feats }
 setActiveSite({ ...activeSite, pricingPlans: plans })
 }}
 className="text-sm font-semibold text-gray-600 dark:text-z-muted hover:text-gray-300 flex items-center gap-1 mt-1 shrink-0"
 >
 <PlusCircleIcon size={10} />
 Add Feature bullet
 </button>
 </div>
 </div>
 </div>

 {/* Popular switcher */}
 <div className="pt-4 border-t border-z-border flex items-center justify-between shrink-0">
 <span className="text-sm font-semibold text-z-secondary">Mark Popular / Recommend Plan</span>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={plan.isPopular || false}
 onChange={(e) => {
 const plans = [...activeSite.pricingPlans]
 plans[planIndex] = { ...plan, isPopular: e.target.checked }
 setActiveSite({ ...activeSite, pricingPlans: plans })
 }}
 className="sr-only peer"
 />
 <div className={cn("w-9 h-4 rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-none after:h-3 after:w-3.5 after:transition-all border shadow-inner", theme === 'dark' ? 'bg-black/80 border-z-border peer-checked:bg-z-accent' : 'bg-gray-200 peer-checked:bg-z-accent')}></div>
 </label>
 </div>
 </div>
 ))}
 </div>
 </div>
 </>
 )}
 </div>
 )
}

export default SettingsBilling
