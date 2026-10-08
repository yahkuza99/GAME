'use strict';
// Job progression is separate from Base progression and the local GM Job 99 preset.
for (const job of Object.values(JOBS)) {
  if (job.tier === 2) job.jobMax = 50;
  if (job.tier === 3) job.jobMax = 60;
}
THIRD_JOB_REQ.job = 50;
