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
      <div className={cn('p-6 border rounded-none-none', dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm')}>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1 flex items-center gap-2">
          <Sparkles size={12} /> AI Component Architect
        </h3>
        <p className={cn('text-[10px] mb-6 font-medium', dark ? 'text-gray-400' : 'text-gray-500')}>
          Describe a component and the AI will generate its complete field schema. Works best with detailed descriptions.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Describe your component</label>
            <textarea
              rows={5}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder='e.g. "A pricing card component with a plan name, price per month, list of up to 5 feature bullets, a CTA button label, a highlighted/featured boolean flag, and a color accent picker."'
              className={cn('w-full border p-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black rounded-none-none placeholder:text-gray-600 resize-none', dark ? 'bg-black border-white/[0.08] focus:border-purple-500/50 text-white' : 'bg-gray-50 border-gray-200 focus:border-purple-500 text-gray-900')}
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
                className={cn('text-[9px] font-bold px-3 py-1.5 border rounded-none-none transition-all', dark ? 'border-white/[0.08] text-gray-500 hover:text-white hover:border-purple-500/50' : 'border-gray-200 text-gray-500 hover:text-black hover:border-purple-400')}
              >
                {suggestion.slice(0, 40)}...
              </button>
            ))}
          </div>

          <button
            disabled={isAIGenerating || !aiPrompt.trim()}
            onClick={handleAIGenerate}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-2 transition-all rounded-none-none disabled:opacity-50 shadow-lg shadow-purple-900/30"
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
