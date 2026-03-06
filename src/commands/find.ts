import { listRemote, type ListOptions } from "./list.ts";

export async function findCommand(args: string[]): Promise<void> {
  let search: string | undefined;
  let category: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if ((arg === "--category" || arg === "-c") && args[i + 1] && !args[i + 1]!.startsWith("-")) {
      category = args[++i];
    } else if (!arg.startsWith("-") && search === undefined) {
      search = arg;
    }
  }

  const options: ListOptions = { showRemote: true, global: false, search, category };
  await listRemote(options);
}
