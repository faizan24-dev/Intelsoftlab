// GET    /api/bulk-mailer/status/[campaignId] — poll progress.
// DELETE /api/bulk-mailer/status/[campaignId] — request cancellation.

import { getCampaign, requestCancel, toStatus } from "@/lib/bulk-mailer/store";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ campaignId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { campaignId } = await params;
  const record = getCampaign(campaignId);
  if (!record) {
    return Response.json(
      {
        error:
          "Unknown campaign. Progress is held in the server's memory, so it is lost if the server restarts.",
      },
      { status: 404 },
    );
  }
  return Response.json({ status: toStatus(record) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { campaignId } = await params;
  const record = getCampaign(campaignId);
  if (!record) return Response.json({ error: "Unknown campaign." }, { status: 404 });

  const accepted = requestCancel(campaignId);
  return Response.json({
    cancelled: accepted,
    status: toStatus(record),
  });
}
