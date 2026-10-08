import type { Env } from './env';
import { route } from './http/router';
import { runScheduledJobs } from './scheduled';

export { fetchAll } from './db';
export { sendBoardPushes } from './jobs/board-push';
export { sendChoreDigests } from './jobs/chore-digest';
export { dispatch } from './jobs/dispatch';
export { enqueue } from './jobs/enqueue';
export { sendBriefs } from './jobs/morning-brief';

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledJobs(env));
  },
  fetch: (req: Request, env: Env): Promise<Response> => route(req, env),
} satisfies ExportedHandler<Env>;
