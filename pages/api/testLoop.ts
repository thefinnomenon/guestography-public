import { iMessageLookup } from "../../lib/loop";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await iMessageLookup("melissas-modown-kYZ5", [
    { phone: "+17817891371" },
    { phone: "+17814377393" },
  ]);
}
