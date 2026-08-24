/* ============================================================================
 * WEBHOOK RETRY PROCESSOR — Phase 9
 *
 * Processes failed webhook events with exponential backoff.
 * Called by platform routes or can be triggered by Vercel cron.
 *
 * Flow:
 *   1. Find events with status='retrying' and nextRetryAt <= now
 *   2. For each: replay the webhook to the registered handler
 *   3. On success: mark as 'processed'
 *   4. On failure: increment retry, calculate next backoff, or dead-letter
 * ========================================================================== */

const WebhookEvent = require('../models/WebhookEvent');

/**
 * Registry of webhook handlers by provider.
 * Each handler receives the stored requestBody and metadata,
 * and should return { ok: true } or throw an error.
 */
const handlers = {};

function registerHandler(provider, handler) {
  handlers[provider] = handler;
}

/**
 * Process all due retries. Returns { processed, failed, deadLettered }.
 */
async function processDueRetries(limit = 20) {
  const due = await WebhookEvent.findDueRetries(limit);
  let processed = 0, failed = 0, deadLettered = 0;

  for (const event of due) {
    const handler = handlers[event.provider];
    if (!handler) {
      // No handler registered — dead letter immediately
      event.status = 'dead_letter';
      event.deadLetteredAt = new Date();
      event.deadLetterReason = `No handler registered for provider: ${event.provider}`;
      event.nextRetryAt = null;
      await event.save();
      deadLettered++;
      continue;
    }

    const start = Date.now();
    try {
      const result = await handler(event.requestBody, event.metadata, event);
      const duration = Date.now() - start;

      if (result && result.ok) {
        event.responseTimeMs = duration;
        await event.markProcessed(duration);
        processed++;
      } else {
        await event.markFailed(result?.error || 'Handler returned not-ok');
        failed++;
      }
    } catch (err) {
      await event.markFailed(err.message || 'Handler threw exception');
      failed++;
    }
  }

  return { processed, failed, deadLettered, total: due.length };
}

/**
 * Manual retry: reset a dead-lettered event and process it immediately.
 */
async function manualRetry(eventId, actor) {
  const event = await WebhookEvent.findById(eventId);
  if (!event) throw new Error('Webhook event not found');

  if (event.status !== 'dead_letter' && event.status !== 'failed') {
    throw new Error(`Cannot retry event with status: ${event.status}`);
  }

  await event.resetForManualRetry(actor);

  const handler = handlers[event.provider];
  if (!handler) {
    throw new Error(`No handler registered for provider: ${event.provider}`);
  }

  const start = Date.now();
  try {
    const result = await handler(event.requestBody, event.metadata, event);
    const duration = Date.now() - start;

    if (result && result.ok) {
      await event.markProcessed(duration);
      return { ok: true, duration };
    } else {
      await event.markFailed(result?.error || 'Handler returned not-ok');
      return { ok: false, error: result?.error || 'Handler returned not-ok' };
    }
  } catch (err) {
    await event.markFailed(err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  registerHandler,
  processDueRetries,
  manualRetry,
};
