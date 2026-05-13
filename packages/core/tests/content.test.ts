import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentService } from '../src/services/content';
import { CollectionConfig } from '../../types/src';

// Mock Mongoose Model
const mockModel: unknown = {
  find: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findByIdAndDelete: vi.fn(),
  findOne: vi.fn(),
};

const mockConfig: CollectionConfig = {
  name: 'Posts',
  slug: 'posts',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'richtext' },
  ],
  versions: true,
  timestamps: true,
};

describe('Zenith ContentService - Engine Validation', () => {
  let service: ContentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentService(mockConfig, mockModel);
  });

  it('should apply field hooks recursively', async () => {
    const mockDoc = { 
      title: 'Hello', 
      toObject: () => ({ title: 'Hello' }) 
    };
    
    // We expect the recursive hook logic to work even with empty hooks
    const result = await (service as unknown).applyFieldHooks(mockDoc, { id: '1' });
    expect(result.title).toBe('Hello');
  });

  it('should find documents with RLS filters', async () => {
    mockModel.find.mockReturnValue({
      lean: () => ({
        exec: () => Promise.resolve([{ title: 'Test Post' }])
      })
    });

    const user = { id: 'user1', role: 'editor' };
    const docs = await service.find({}, { user });
    
    expect(mockModel.find).toHaveBeenCalled();
    expect(docs[0].title).toBe('Test Post');
  });

  it('should calculate delta on update', async () => {
    const oldDoc = { _id: '1', title: 'Old Title', content: 'Old Content' };
    const newData = { title: 'New Title' };
    
    mockModel.findById.mockReturnValue({
      session: () => ({
        lean: () => ({
          exec: () => Promise.resolve(oldDoc)
        })
      })
    });

    mockModel.findByIdAndUpdate.mockReturnValue({
      toObject: () => ({ ...oldDoc, ...newData })
    });

    const { delta } = await service.update('1', newData, { user: { id: 'admin' } });
    
    expect(delta.title).toEqual({ from: 'Old Title', to: 'New Title' });
    expect(delta.content).toBeUndefined(); // Content didn't change
  });
});
