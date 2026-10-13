/**
 * Market-data refresh moved to lib/scheduled.ts (runMarketRefresh), shared by Vercel Cron and the
 * worker. Kept as an alias for scripts that still import it.
 */
import { runMarketRefresh, NO_DEADLINE } from '../lib/scheduled'

export const runJobScraper = () => runMarketRefresh(NO_DEADLINE)
