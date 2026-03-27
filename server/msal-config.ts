import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";

export function getMsalClient(): ConfidentialClientApplication | null {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return null;
  }

  // For multi-tenant support, use "common" (allows both personal and work/school accounts)
  // Other options: "organizations" (work/school only), or a specific tenant ID
  // If MICROSOFT_TENANT_ID is not set, default to "common" for multi-tenant
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";

  const msalConfig: Configuration = {
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    },
    system: {
      loggerOptions: {
        loggerCallback(loglevel, message, containsPii) {
          if (!containsPii) {
            console.log(message);
          }
        },
        piiLoggingEnabled: false,
        logLevel: 3,
      },
    },
  };

  return new ConfidentialClientApplication(msalConfig);
}

export function getRedirectUri(req: any): string {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/api/auth/microsoft/callback`;
}
