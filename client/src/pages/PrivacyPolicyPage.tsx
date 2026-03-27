import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  const [_, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">Privacy Policy</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardContent className="p-8 prose prose-slate max-w-none dark:prose-invert">
            <h1>Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Introduction</h2>
            <p>
              OECS Content Creator ("we," "our," or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our educational content creation platform.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Information You Provide</h3>
            <ul>
              <li>Account information (name, email address, profile information)</li>
              <li>Educational content you create (quizzes, flashcards, videos, etc.)</li>
              <li>Metadata associated with your content (subject, grade level, age range)</li>
              <li>Communication data when you contact us for support</li>
            </ul>

            <h3>2.2 Automatically Collected Information</h3>
            <ul>
              <li>Usage data and analytics (how you interact with the platform)</li>
              <li>Device information (browser type, operating system)</li>
              <li>IP address and location data (for security and compliance)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our services</li>
              <li>Process your account registration and manage your account</li>
              <li>Enable content creation, sharing, and collaboration features</li>
              <li>Track student progress and engagement with your content</li>
              <li>Send you service-related communications</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Ensure platform security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>4. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
            <ul>
              <li><strong>Public Content:</strong> Content you choose to publish publicly may be visible to other users</li>
              <li><strong>Service Providers:</strong> We may share data with trusted third-party service providers who assist in operating our platform</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
            </ul>

            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over 
              the Internet is 100% secure.
            </p>

            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate or incomplete data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability (receive your data in a structured format)</li>
              <li>Withdraw consent at any time</li>
            </ul>

            <h2>7. Children's Privacy</h2>
            <p>
              Our platform is designed for educators. We do not knowingly collect personal information from children 
              under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>

            <h2>8. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, and improve 
              our services. You can control cookie preferences through your browser settings.
            </p>

            <h2>9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. 
              We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>

            <h2>10. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our services, comply with legal 
              obligations, resolve disputes, and enforce our agreements. You may request deletion of your account and 
              associated data at any time.
            </p>

            <h2>11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date.
            </p>

            <h2>12. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p>
              <strong>OECS Content Creator</strong><br />
              Email: privacy@oecslearning.org<br />
              Website: https://contentmaker.oecslearning.org
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

