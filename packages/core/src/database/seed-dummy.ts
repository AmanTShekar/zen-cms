import { CollectionConfig } from '@zenith-open/zenithcms-types'
import { DatabaseAdapter } from './adapters/BaseAdapter'

/**
 * Zenith Dummy Data Seeder
 * ────────────────────────
 * Populates the system with high-fidelity dummy data for demonstrations.
 */
export async function seedDummyData(collections: CollectionConfig[], adapter: DatabaseAdapter) {
  console.log('🌱 Starting Zenith Dummy Seeding...')

  for (const config of collections) {
    const count = await adapter.count(config.slug, {})

    if (count > 0) {
      console.log(`- ${config.slug}: Already has ${count} entries. Skipping.`)
      continue
    }

    console.log(`- ${config.slug}: Seeding dummy entries...`)

    const dummies: any[] = []

    if (config.slug === 'products' || config.slug === 'listings') {
      dummies.push(
        {
          name: 'Skyline Penthouse',
          price: 4500000,
          description:
            'Ultra-luxury penthouse with 360-degree city views and private infinity pool.',
          category: 'Luxury',
          _status: 'published',
        },
        {
          name: 'Oceanfront Villa',
          price: 8200000,
          description:
            'Direct beach access with minimalist glass architecture and smart home integration.',
          category: 'Premium',
          _status: 'published',
        },
        {
          name: 'Mountain Retreat',
          price: 1200000,
          description:
            'Secluded sustainable cabin with geothermal heating and expansive forest views.',
          category: 'Standard',
          _status: 'draft',
        }
      )
    } else if (config.slug === 'blog-posts' || config.slug === 'articles') {
      dummies.push(
        {
          title: 'The Future of Headless CMS',
          content: 'Headless is not just about decoupling; it is about architectural freedom...',
          _status: 'published',
        },
        {
          title: 'Zenith v2.0 Release Notes',
          content:
            'We are proud to introduce the AI Schema Architect and Real-time Style Injection...',
          _status: 'published',
        },
        {
          title: 'Designing for Performance',
          content:
            'Optimization starts at the data layer. Learn how Zenith handles high-concurrency...',
          _status: 'draft',
        }
      )
    } else if (config.slug === 'authors' || config.slug === 'team') {
      dummies.push(
        {
          name: 'Sarah Zenith',
          email: 'sarah@zenith.ai',
          bio: 'Founder and Lead Architect of the Zenith CMS project.',
          role: 'Admin',
          _status: 'published',
        },
        {
          name: 'Alex Editor',
          email: 'alex@zenith.ai',
          bio: 'Content strategist focused on developer experience.',
          role: 'Editor',
          _status: 'published',
        }
      )
    } else {
      // Generic dummy for any other collection
      dummies.push(
        {
          title: 'Sample Entry 1',
          description: 'Auto-generated dummy data for ' + config.name,
          _status: 'published',
        },
        {
          title: 'Sample Entry 2',
          description: 'Advanced demonstration record with rich metadata.',
          _status: 'published',
        }
      )
    }

    if (dummies.length > 0) {
      // 🚀 Smart slug generation for validation compliance
      const processedDummies = dummies.map((d) => {
        if (!d.slug) {
          const base = d.title || d.name || 'entry'
          d.slug =
            base
              .toLowerCase()
              .replace(/ /g, '-')
              .replace(/[^\w-]+/g, '') +
            '-' +
            Math.random().toString(36).substring(7)
        }
        return d
      })
      for (const dummy of processedDummies) {
        await adapter.create(config.slug, dummy)
      }
    }
  }

  console.log('✅ Zenith Seeding Complete!')
}
