import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";

export function getMsalClient(): ConfidentialClientApplication | null {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_TENANT_ID) {
    return null;
  }

  const msalConfig: Configuration = {
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
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
