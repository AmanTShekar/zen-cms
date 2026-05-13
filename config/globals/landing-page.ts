import type { GlobalConfig } from '@zenith/types';

export const LandingPage: GlobalConfig = {
  name: 'Landing Page',
  slug: 'landing-page',
  singleton: true,
  publicRead: true,
  versions: true,
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Page Title' },
    { name: 'heroDescription', type: 'richtext', label: 'Main Content / Description' },
    {
      name: 'sections',
      type: 'blocks',
      blocks: [
        {
          slug: 'hero',
          labels: { singular: 'Hero Banner', plural: 'Hero Banners' },
          fields: [
            { name: 'headline', type: 'text', label: 'Main Headline' },
            { name: 'subheadline', type: 'textarea', label: 'Sub-headline Text' },
            { name: 'callToAction', type: 'text', label: 'Button Label' },
            { name: 'backgroundImage', type: 'media', label: 'Background Image' },
          ]
        },
        {
          slug: 'features',
          labels: { singular: 'Key Features', plural: 'Feature Sections' },
          fields: [
            { name: 'heading', type: 'text', label: 'Section Heading' },
            {
              name: 'featureList',
              type: 'array',
              label: 'Feature Items',
              fields: [
                { name: 'title', type: 'text', label: 'Feature Title' },
                { name: 'description', type: 'textarea', label: 'Feature Description' },
                { name: 'icon', type: 'media', label: 'Feature Icon' },
              ]
            }
          ]
        },
        {
          slug: 'testimonials',
          labels: { singular: 'Testimonial Slider', plural: 'Testimonial Sections' },
          fields: [
            { name: 'heading', type: 'text', label: 'Section Heading' },
            {
              name: 'items',
              type: 'array',
              label: 'Testimonials',
              fields: [
                { name: 'quote', type: 'textarea', label: 'Quote' },
                { name: 'author', type: 'text', label: 'Author Name' },
                { name: 'role', type: 'text', label: 'Author Role/Company' },
                { name: 'avatar', type: 'media', label: 'Author Avatar' },
              ]
            }
          ]
        },
        {
          slug: 'pricing',
          labels: { singular: 'Pricing Table', plural: 'Pricing Sections' },
          fields: [
            { name: 'heading', type: 'text', label: 'Section Heading' },
            {
              name: 'plans',
              type: 'array',
              label: 'Pricing Plans',
              fields: [
                { name: 'name', type: 'text', label: 'Plan Name' },
                { name: 'price', type: 'text', label: 'Price (e.g. $29/mo)' },
                { name: 'features', type: 'textarea', label: 'Features (one per line)' },
                { name: 'buttonText', type: 'text', label: 'CTA Button' },
                { name: 'isPopular', type: 'checkbox', label: 'Highlight as Popular' },
              ]
            }
          ]
        },
        {
          slug: 'faq',
          labels: { singular: 'FAQ Accordion', plural: 'FAQ Sections' },
          fields: [
            { name: 'heading', type: 'text', label: 'Section Heading' },
            {
              name: 'questions',
              type: 'array',
              label: 'Questions & Answers',
              fields: [
                { name: 'question', type: 'text', label: 'Question' },
                { name: 'answer', type: 'textarea', label: 'Answer' },
              ]
            }
          ]
        },
        {
          slug: 'cta',
          labels: { singular: 'Call to Action Banner', plural: 'CTA Sections' },
          fields: [
            { name: 'title', type: 'text', label: 'Title' },
            { name: 'description', type: 'textarea', label: 'Description' },
            { name: 'buttonText', type: 'text', label: 'Button Label' },
            { name: 'link', type: 'text', label: 'Button Link' },
          ]
        },
        {
          slug: 'stats',
          labels: { singular: 'Impact Stats', plural: 'Stat Sections' },
          fields: [
            {
              name: 'items',
              type: 'array',
              label: 'Stats',
              fields: [
                { name: 'value', type: 'text', label: 'Value (e.g. 99%)' },
                { name: 'label', type: 'text', label: 'Label (e.g. Uptime)' },
              ]
            }
          ]
        },
        {
          slug: 'richTextSection',
          labels: { singular: 'Custom Content', plural: 'Content Sections' },
          fields: [
            { name: 'content', type: 'richtext', label: 'Rich Text Body' }
          ]
        }
      ]
    }
  ]
};
