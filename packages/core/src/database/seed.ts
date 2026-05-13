import mongoose from 'mongoose';
import { UserModel } from './user-model';
import { AuthService } from '../services/auth';
import { logger } from '../services/logger';

/**
 * Zenith Seeding Engine
 * ─────────────────────
 * Automates initial setup of the CMS (Admin creation, default settings).
 */
export async function seedInitialData() {
  try {
    const adminExists = await UserModel.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@zenith.com';
      const password = process.env.INITIAL_ADMIN_PASSWORD || 'Zenith2024!';
      
      const hashedPassword = await AuthService.hashPassword(password);
      
      await UserModel.create({
        email,
        password: hashedPassword,
        role: 'admin'
      });
      
      logger.info({ email }, 'Initial Admin user created automatically');
    }

    // Seed Real Data for Demo Site
    const LandingPageModel = (mongoose.models['landing-page'] || null) as any;
    const ProductModel = (mongoose.models['products'] || null) as any;

    if (LandingPageModel) {
      const hasLanding = await LandingPageModel.findOne();
      if (!hasLanding) {
        await LandingPageModel.create({
          title: 'Welcome to Zenith Next-Gen Commerce',
          heroDescription: 'Experience the fastest headless commerce backend designed for the modern web.',
          sections: [
            {
              blockType: 'hero',
              blockData: {
                headline: 'The Future of Headless Commerce is Here',
                subheadline: 'Zenith CMS gives you the tools to build, manage, and scale your content with zero friction.',
                callToAction: 'Get Started Now',
                backgroundImage: { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000' }
              }
            },
            {
              blockType: 'stats',
              blockData: {
                items: [
                  { value: '100ms', label: 'API Response Time' },
                  { value: '99.9%', label: 'System Uptime' },
                  { value: '24/7', label: 'AI Assistance' },
                  { value: '∞', label: 'Scalability' }
                ]
              }
            },
            {
              blockType: 'features',
              heading: 'Why Developers Love Zenith',
              featureList: [
                { 
                  title: 'Lightning Fast API', 
                  description: 'Optimized MongoDB queries and intelligent caching ensure sub-100ms response times.',
                  icon: { url: 'https://images.unsplash.com/photo-1635332305373-c60368149806?auto=format&fit=crop&q=80&w=200' }
                },
                { 
                  title: 'AI Co-pilot', 
                  description: 'Auto-generate SEO meta, alt text, and even entire blog posts using integrated AI tools.',
                  icon: { url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=200' }
                },
                { 
                  title: 'Modular Design', 
                  description: 'Use our Dynamic Blocks to build pages visually without touching a single line of code.',
                  icon: { url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=200' }
                }
              ]
            },
            {
              blockType: 'testimonials',
              blockData: {
                heading: 'Loved by Teams Worldwide',
                items: [
                  { 
                    quote: 'Zenith has completely transformed how we manage our global content pipeline. The UI is stunning and the API is incredibly fast.',
                    author: 'Sarah Chen',
                    role: 'CTO at TechFlow',
                    avatar: { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' }
                  },
                  { 
                    quote: 'The block-based page builder is a game changer. Our marketing team can now launch pages in minutes instead of days.',
                    author: 'Marcus Aurelius',
                    role: 'Head of Marketing at Nexus',
                    avatar: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' }
                  }
                ]
              }
            },
            {
              blockType: 'pricing',
              blockData: {
                heading: 'Plans that Scale with You',
                plans: [
                  { name: 'Developer', price: '$0', features: 'Up to 3 users\n100GB Bandwidth\nCommunity Support', buttonText: 'Get Started' },
                  { name: 'Pro', price: '$49/mo', features: 'Unlimited users\n1TB Bandwidth\nPriority Email Support\nAI Assistant', buttonText: 'Upgrade Now', isPopular: true },
                  { name: 'Enterprise', price: 'Custom', features: 'White-labeling\nCustom Storage\n24/7 Dedicated Support', buttonText: 'Contact Sales' }
                ]
              }
            },
            {
              blockType: 'faq',
              blockData: {
                heading: 'Frequently Asked Questions',
                questions: [
                  { question: 'Is Zenith really headless?', answer: 'Yes, Zenith is a fully headless CMS that provides a rich REST and GraphQL API to consume your content on any platform.' },
                  { question: 'Can I host it myself?', answer: 'Absolutely. Zenith is open-core and designed to be easily deployed on any cloud provider or on-premise server.' }
                ]
              }
            },
            {
              blockType: 'cta',
              blockData: {
                title: 'Ready to build the future?',
                description: 'Join the Zenith community today and experience the power of modern headless content management.',
                buttonText: 'Start Your Project',
                link: '/admin'
              }
            }
          ],
          _status: 'published'
        });
        logger.info('Seeded Landing Page with Dynamic Blocks');
      }
    }


    if (ProductModel) {
      const productCount = await ProductModel.countDocuments();
      if (productCount === 0) {
        await ProductModel.insertMany([
          {
            title: 'Sony WH-1000XM5',
            price: 349,
            category: 'electronics',
            description: '<p>Industry leading noise canceling headphones with superior sound quality.</p>',
            gallery: [{ url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800', type: 'image' }],
            inStock: true,
            _status: 'published'
          },
          {
            title: 'MacBook Pro M3',
            price: 1599,
            category: 'electronics',
            description: '<p>Mind-blowing performance with the new M3 chip.</p>',
            gallery: [{ url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800', type: 'image' }],
            inStock: true,
            _status: 'published'
          },
          {
            title: 'Minimalist Chair',
            price: 129,
            category: 'home',
            description: '<p>Ergonomic minimalist chair for your modern workspace.</p>',
            gallery: [{ url: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=800', type: 'image' }],
            inStock: true,
            _status: 'published'
          }
        ]);
        logger.info('Seeded 3 real Products');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Seeding failed');
  }
}
