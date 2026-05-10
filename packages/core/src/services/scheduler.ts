import { CollectionConfig } from '@zenith/types';
import { getModelForCollection } from '../database/model-factory';
import { logger } from './logger';

/**
 * Zenith Scheduler Service
 * ───────────────────────
 * Background worker that handles post scheduling.
 * Periodically checks for 'draft' posts with 'scheduledAt' <= now and publishes them.
 */
export class SchedulerService {
  private static interval: NodeJS.Timeout | null = null;

  /** Alias start as init to match engine bootstrap call */
  static init(collections: CollectionConfig[]) {
    return this.start(collections);
  }

  static start(collections: CollectionConfig[]) {
    if (this.interval) return;

    logger.info('Scheduler service: started');
    
    this.interval = setInterval(async () => {
      for (const config of collections) {
        if (!config.scheduling || !config.drafts) continue;

        try {
          const Model = getModelForCollection(config);
          const now = new Date();

          const result = await Model.updateMany(
            {
              _status: 'draft',
              scheduledAt: { $lte: now }
            },
            {
              $set: { _status: 'published' },
              $unset: { scheduledAt: 1 }
            }
          );

          if (result.modifiedCount > 0) {
            logger.info({ collection: config.slug, count: result.modifiedCount }, 'Scheduled content published');
          }
        } catch (err) {
          logger.error({ err, collection: config.slug }, 'Scheduler failed for collection');
        }
      }
    }, 60000); // Check every minute
  }

  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
