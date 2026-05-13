import type { CollectionConfig } from '@zenith/types';

export const Member: CollectionConfig = {
  name: 'Members',
  slug: 'members',
  labels: {
    singular: 'Member',
    plural: 'Members'
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'subscriptionStatus', 'createdAt'],
  },
  fields: [
    { name: 'email', type: 'text', required: true, unique: true, label: 'Email Address' },
    { name: 'name', type: 'text', label: 'Full Name' },
    { 
      name: 'subscriptionStatus', 
      type: 'select', 
      label: 'Subscription Status',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Architect', value: 'architect' },
        { label: 'Nexus', value: 'nexus' },
        { label: 'None', value: 'none' },
      ],
      defaultValue: 'none'
    },
    { name: 'isSubscribed', type: 'checkbox', label: 'Is Paid Subscriber', defaultValue: false },
    { 
      name: 'activity', 
      type: 'select', 
      label: 'Pulse Engagement',
      options: [
        { label: 'Low', value: 'Low' },
        { label: 'Medium', value: 'Medium' },
        { label: 'High', value: 'High' },
        { label: 'Critical', value: 'Critical' },
      ],
      defaultValue: 'Medium'
    },
    { name: 'avatar', type: 'media', label: 'Profile Avatar' },
    { name: 'bio', type: 'textarea', label: 'Member Biography' },
  ]
};
