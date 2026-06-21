import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export const BuilderAITab = ({
  aiPrompt,
  setAiPrompt,
  isAIGenerating,
  handleAIGenerate,
  dark
}: any) => {
  return (
    <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className={cn('p-6 border rounded-none shadow-sm transition-all', 'z-panel')}>
        <h3 className="text-sm font-semibold text-z-active-text mb-1 flex items-center gap-2">
          <Sparkles size={12} /> AI Component Architect
        </h3>
        <p className={cn('text-sm mb-6 font-medium', dark ? 'text-z-muted' : 'text-z-secondary')}>
          Describe a component and the AI will generate its complete field schema. Works best with detailed descriptions.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-z-secondary block mb-2">Describe your component</label>
            <textarea
              rows={5}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder='e.g. "A pricing card component with a plan name, price per month, list of up to 5 feature bullets, a CTA button label, a highlighted/featured boolean flag, and a color accent picker."'
              className={cn('w-full border p-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black rounded-none placeholder:text-gray-600 resize-none shadow-inner', dark ? 'bg-black/40 backdrop-blur-sm border-z-border focus:border-z-accent/50 text-white' : 'bg-z-input border-z-border focus:border-z-accent text-z-primary')}
            />
          </div>

          {/* Prompt suggestions */}
          <div className="flex flex-wrap gap-2">
            {[
              'Navigation bar with logo, links array, and CTA button',
              'Product card with image, name, price, and discount badge',
              'Team member card with photo, name, role, bio, and social links',
              'Testimonial with quote, author, avatar, rating, and company',
            ].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => setAiPrompt(suggestion)}
                className={cn('text-sm font-semibold   px-3 py-1.5 border rounded-none transition-all', dark ? 'border-z-border text-z-secondary hover:text-white hover:border-z-accent/50 hover:bg-z-active-bg' : 'border-z-border text-z-secondary hover:text-black hover:border-z-active-border')}
              >
                {suggestion.slice(0, 40)}...
              </button>
            ))}
          </div>

          <button
            disabled={isAIGenerating || !aiPrompt.trim()}
            onClick={handleAIGenerate}
            className="w-full py-4 bg-z-accent hover:opacity-90 text-white text-sm font-semibold flex justify-center items-center gap-2 transition-all rounded-none disabled:opacity-50 shadow-sm"
          >
            {isAIGenerating
              ? <><Loader2 size={14} className="animate-spin" /> Generating with AI...</>
              : <><Sparkles size={14} /> Generate Component</>
            }
          </button>
        </div>
      </div>
    </motion.div>
  )
}
