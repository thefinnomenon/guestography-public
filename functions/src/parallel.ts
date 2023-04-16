export const limit = async (tasks: any[], concurrency = 5) => {
  const results: any[] = [];

  async function runTasks(tasksIterator: any) {
    for (const [index, task] of tasksIterator) {
      try {
        results[index] = await task();
      } catch (error: any) {
        results[index] = new Error(`Failed with: ${error.message}`);
      }
    }
  }

  const workers = new Array(concurrency).fill(tasks.entries()).map(runTasks);

  await Promise.allSettled(workers);

  return results;
};
