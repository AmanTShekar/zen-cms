import { Router, Request, Response } from 'express';
import { systemRouter1 } from './plugins-schemas';
import { systemRouter2 } from './identity-access';
import { systemRouter3 } from './search-ai';
import { systemRouter4 } from './cache-jobs';
import { systemRouter5 } from './audit-logs';
import { systemRouter6 } from './ops';
import { settingsRouter } from './settings';
import { templatesRouter } from './templates';

const router: Router = Router();
router.use(systemRouter1);
router.use(systemRouter2);
router.use(systemRouter3);
router.use(systemRouter4);
router.use(systemRouter5);
router.use(systemRouter6);
router.use('/settings', settingsRouter);
router.use('/templates', templatesRouter);

export default router;
