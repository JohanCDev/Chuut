import {onSchedule} from "firebase-functions/scheduler";
import * as logger from "firebase-functions/logger";
import {auth, ANON_RETENTION_DAYS} from "./admin";
import {deleteUserCompletely} from "./cleanup";

export const purgeAnonymous = onSchedule(
  {schedule: "every day 03:00", timeZone: "Europe/Paris", timeoutSeconds: 540},
  async () => {
    const cutoff = Date.now() - ANON_RETENTION_DAYS * 24 * 3600 * 1000;
    let purged = 0;
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const u of page.users) {
        if (u.providerData.length > 0) continue; // linked: real account
        const last = Math.max(
          Date.parse(u.metadata.lastRefreshTime ?? "") || 0,
          Date.parse(u.metadata.lastSignInTime) || 0,
          Date.parse(u.metadata.creationTime) || 0,
        );
        if (last < cutoff) {
          await deleteUserCompletely(u.uid);
          purged++;
        }
      }
      pageToken = page.pageToken;
    } while (pageToken);
    logger.info("purgeAnonymous done", {purged});
  },
);
