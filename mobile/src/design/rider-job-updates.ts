type JobIdentity = { id: number; stage: string };
export const riderJobKey = (job: JobIdentity) => `${job.stage}:${job.id}`;
export function unseenRiderJobs<T extends JobIdentity>(jobs: T[], seen: Record<string, boolean> = {}) {
  return jobs.filter(job => !seen[riderJobKey(job)]);
}
export function createRiderJobTracker() {
  let previous: Set<string> | null = null;
  return {
    reset() { previous = null; },
    receive<T extends JobIdentity>(online: boolean, jobs: T[]): T[] {
      if (!online) { previous = null; return []; }
      const current = new Map(jobs.map(job => [riderJobKey(job), job]));
      const fresh = previous ? [...current].filter(([key]) => !previous!.has(key)).map(([, job]) => job) : [];
      previous = new Set(current.keys());
      return fresh;
    },
  };
}
export function riderJobBadge(count: number) { return count > 9 ? "9+" : count > 0 ? String(count) : undefined; }
