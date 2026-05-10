export type FieldType = 
  | 'text' 
  | 'number' 
  | 'email'
  | 'textarea'
  | 'checkbox'
  | 'date'
  | 'select' 
  | 'media' 
  | 'richtext' 
  | 'json'
  | 'group'
  | 'tabs'
  | 'array' 
  | 'relation'
  | 'blocks'
  | 'boolean';

export interface BlockDefinition {
  slug: string;
  labels?: { singular: string; plural: string };
  fields: FieldConfig[];
}

export interface FieldAdminConfig {
  placeholder?: string;
  description?: string;
  hidden?: boolean;
  readOnly?: boolean;
  width?: string; // e.g. "50%"
  condition?: (data: any, siblingData: any) => boolean;
}

export interface FieldConfig {
  name: string;
  type: FieldType;
  label?: string;
  required?: boolean;
  unique?: boolean;
  localized?: boolean;
  virtual?: boolean; // New: Virtual fields not stored in DB
  defaultValue?: any;
  
  // Specific to basic types (text, number, select)
  hasMany?: boolean; 
  options?: (string | { label: string; value: string })[];
  
  // Specific to groups, tabs, arrays
  fields?: FieldConfig[];
  tabs?: { label: string; fields: FieldConfig[] }[];
  
  // Specific to relations
  collection?: string;
  
  // Specific to blocks
  blocks?: BlockDefinition[];
  
  // Admin UI specific
  admin?: FieldAdminConfig;
  
  // Hooks
  hooks?: {
    beforeChange?: (value: any) => any | Promise<any>;
    afterRead?: (value: any) => any | Promise<any>;
    validate?: (value: any, data: any) => boolean | string | Promise<boolean | string>;
  };
  
  // Field-level Access
  access?: {
    read?: (user: any) => boolean;
    update?: (user: any) => boolean;
    create?: (user: any) => boolean;
  };
}

export interface CollectionConfig {
  name: string;
  slug: string;
  labels?: {
    singular: string;
    plural: string;
  };
  fields: FieldConfig[];
  drafts?: boolean;
  seo?: boolean;
  timestamps?: boolean;
  singleton?: boolean; 
  versions?: boolean; // Enable document history tracking
  scheduling?: boolean; // Enable post scheduling
  publicRead?: boolean; // New: Allow unauthenticated read access

  // Lifecycle Hooks (Strapi-inspired but pipeline-based)
  hooks?: {
    beforeValidate?: (data: any, user: any) => any | Promise<any>;
    beforeCreate?: (data: any, user: any) => any | Promise<any>;
    afterCreate?: (doc: any, user: any) => void | Promise<void>;
    beforeUpdate?: (data: any, user: any) => any | Promise<any>;
    afterUpdate?: (doc: any, user: any) => void | Promise<void>;
    beforeDelete?: (id: string, user: any) => void | Promise<void>;
    afterDelete?: (id: string, user: any) => void | Promise<void>;
    afterRead?: (doc: any, user: any) => any | Promise<any>;
    afterError?: (error: Error, data: any, user: any) => void | Promise<void>;
  };

  // Collection-level Access
  access?: {
    read?: (user: any) => boolean | object; // Support query-based access
    create?: (user: any) => boolean;
    update?: (user: any) => boolean;
    delete?: (user: any) => boolean;
  };

  // Admin UI Polish (Directus/Payload inspired)
  admin?: {
    group?: string; // Sidebar grouping
    hidden?: boolean;
    useAsTitle?: string; // Field to show in list views
    displayTemplate?: string; // e.g. "{{title}} ({{author}})"
    defaultColumns?: string[];
    icon?: string; // Lucide icon name
    previewUrl?: string | ((doc: any) => string); // For live preview
  };

  // Custom Endpoints (Payload-style)
  endpoints?: {
    path: string;
    method: 'get' | 'post' | 'put' | 'delete' | 'patch';
    handler: (req: any, res: any) => void | Promise<void>;
  }[];
}

export interface WebhookTarget {
  url: string;
  secret: string;
  events: string[]; // e.g. ['collection.created', '*' for all]
}

export interface CMSConfig {
  collections: CollectionConfig[];
  globals?: CollectionConfig[];
  webhooks?: WebhookTarget[];
}
