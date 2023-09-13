import { Router } from 'express';
import { getPreferences, upsertPreferences } from '../db';

export const preferencesRouter = Router();

preferencesRouter.get('/v1/preferences/:customerId', async (req, res, next) => {
  try {
    const prefs = await getPreferences(req.params.customerId);
    res.json(prefs);
  } catch (err) {
    next(err);
  }
});

preferencesRouter.put('/v1/preferences/:customerId', async (req, res, next) => {
  try {
    const { email_enabled, push_enabled, device_token } = req.body ?? {};
    if (typeof email_enabled !== 'boolean' || typeof push_enabled !== 'boolean') {
      res.status(400).json({
        error: { code: 'invalid_request', message: 'email_enabled y push_enabled son booleanos requeridos' },
      });
      return;
    }
    const prefs = await upsertPreferences(req.params.customerId, {
      email_enabled,
      push_enabled,
      device_token: device_token ?? null,
    });
    res.json(prefs);
  } catch (err) {
    next(err);
  }
});
