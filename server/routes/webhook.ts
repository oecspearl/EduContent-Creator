import crypto from "crypto";
import { execFile } from "child_process";
import path from "path";
import type { RouteContext } from "./types";

/**
 * GitHub webhook endpoint — automatically pulls the latest code
 * when a push event is received on the configured branch.
 *
 * Setup:
 * 1. Set GITHUB_WEBHOOK_SECRET in your environment variables
 * 2. In GitHub repo → Settings → Webhooks → Add webhook:
 *    - Payload URL: https://your-domain.com/api/webhook/github
 *    - Content type: application/json
 *    - Secret: (same value as GITHUB_WEBHOOK_SECRET)
 *    - Events: Just the push event
 */
export function registerWebhookRoutes({ app }: RouteContext) {
  app.post("/api/webhook/github", (req: any, res) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
      console.warn("[webhook] GITHUB_WEBHOOK_SECRET is not set — webhook disabled");
      return res.status(503).json({ message: "Webhook not configured" });
    }

    // Verify signature
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    if (!signature) {
      return res.status(401).json({ message: "Missing signature" });
    }

    const rawBody = req.rawBody as Buffer | undefined;
    if (!rawBody) {
      return res.status(400).json({ message: "Missing raw body" });
    }

    const expected = "sha256=" + crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      console.warn("[webhook] Invalid signature — rejecting request");
      return res.status(401).json({ message: "Invalid signature" });
    }

    // Only act on push events
    const event = req.headers["x-github-event"];
    if (event !== "push") {
      return res.status(200).json({ message: `Ignored event: ${event}` });
    }

    // Only pull for the main branch
    const payload = req.body;
    const branch = payload?.ref?.replace("refs/heads/", "");
    const targetBranch = process.env.GITHUB_WEBHOOK_BRANCH || "main";

    if (branch !== targetBranch) {
      return res.status(200).json({ message: `Ignored branch: ${branch}` });
    }

    // Respond immediately, then pull in the background
    res.status(200).json({ message: "Pulling latest changes..." });

    const repoDir = path.resolve(process.cwd());
    console.log(`[webhook] Push to ${branch} detected — running git pull in ${repoDir}`);

    execFile("git", ["pull", "origin", targetBranch], { cwd: repoDir }, (error, stdout, stderr) => {
      if (error) {
        console.error("[webhook] git pull failed:", error.message);
        console.error("[webhook] stderr:", stderr);
        return;
      }
      console.log("[webhook] git pull succeeded:", stdout.trim());

      // Optionally run npm install if package.json changed
      if (stdout.includes("package.json") || stdout.includes("package-lock.json")) {
        console.log("[webhook] package.json changed — running npm install...");
        execFile("npm", ["install"], { cwd: repoDir }, (installErr, installOut, installStderr) => {
          if (installErr) {
            console.error("[webhook] npm install failed:", installErr.message);
            console.error("[webhook] stderr:", installStderr);
            return;
          }
          console.log("[webhook] npm install succeeded");
        });
      }
    });
  });
}
