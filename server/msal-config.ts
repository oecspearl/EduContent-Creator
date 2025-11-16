import { ConfidentialClientApplication } from '@azure/msal-node';

export function getMsalClient() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'; // 'common' allows any Microsoft account

  if (!clientId || !clientSecret) {
    return null;
  }

  const msalConfig = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
    system: {
      loggerOptions: {
        loggerCallback(loglevel: any, message: string, containsPii: boolean) {
          if (!containsPii) {
            console.log(message);
          }
        },
        piiLoggingEnabled: false,
        logLevel: 3, // Info level
      },
    },
  };

  return new ConfidentialClientApplication(msalConfig);
}

export function getRedirectUri() {
  // Domain precedence: REPLIT_DOMAINS (custom domain) → REPL_SLUG (workspace URL) → h5pcreator.org (default)
  // Format: "domain1.com,domain2.com" - we use the first one
  const customDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
  
  const baseUrl = process.env.NODE_ENV === 'production'
    ? customDomain 
      ? `https://${customDomain}`
      : process.env.REPL_SLUG && process.env.REPL_OWNER
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : 'https://h5pcreator.org' // Final fallback to production domain
    : 'http://localhost:5000';
  
  return `${baseUrl}/api/auth/microsoft/callback`;
}

export function getLogoutRedirectUri() {
  // Domain precedence: REPLIT_DOMAINS (custom domain) → REPL_SLUG (workspace URL) → h5pcreator.org (default)
  const customDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
  
  return process.env.NODE_ENV === 'production'
    ? customDomain 
      ? `https://${customDomain}`
      : process.env.REPL_SLUG && process.env.REPL_OWNER
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : 'https://h5pcreator.org' // Final fallback to production domain
    : 'http://localhost:5000';
}
