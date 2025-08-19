import { NextApiRequest, NextApiResponse } from "next";
import { iMessageLookup, iMessageSend } from "../../lib/loop";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // await iMessageLookup("melissas-modown-kYZ5", [
  //   { phone: "+17817891371" },
  //   { phone: "+17818206752" },
  //   { phone: "+17814377393" },
  // ]);

  await iMessageSend(
    "+17817891371",
    "Melissa's Modown",
    "React with 👍🏼 to join!"
  );
}
