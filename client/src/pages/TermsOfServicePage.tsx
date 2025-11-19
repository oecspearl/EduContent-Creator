import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
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
              <h1 className="text-lg font-semibold">Terms of Service</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardContent className="p-8 prose prose-slate max-w-none dark:prose-invert">
            <h1>Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using OECS Content Creator ("the Service"), you accept and agree to be bound by the 
              terms and provision of this agreement. If you do not agree to abide by the above, please do not use 
              this service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              OECS Content Creator is an educational content creation platform that enables educators to create, 
              share, and manage interactive educational content including quizzes, flashcards, videos, presentations, 
              and other educational materials.
            </p>

            <h2>3. User Accounts</h2>
            <h3>3.1 Account Creation</h3>
            <p>
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and update your account information to keep it accurate</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>

            <h3>3.2 Account Eligibility</h3>
            <p>
              You must be at least 18 years old or have the consent of a parent or guardian to use this Service. 
              The Service is intended for educators and educational institutions.
            </p>

            <h2>4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Upload, post, or transmit any content that is harmful, offensive, or violates others' rights</li>
              <li>Impersonate any person or entity or misrepresent your affiliation</li>
              <li>Interfere with or disrupt the Service or servers connected to the Service</li>
              <li>Attempt to gain unauthorized access to any portion of the Service</li>
              <li>Use automated systems (bots, scrapers) to access the Service without permission</li>
              <li>Copy, modify, or create derivative works of the Service</li>
              <li>Reverse engineer or attempt to extract source code from the Service</li>
            </ul>

            <h2>5. User Content</h2>
            <h3>5.1 Content Ownership</h3>
            <p>
              You retain ownership of all content you create, upload, or submit to the Service ("User Content"). 
              By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, 
              reproduce, modify, and distribute your content solely for the purpose of providing and improving 
              the Service.
            </p>

            <h3>5.2 Content Responsibility</h3>
            <p>
              You are solely responsible for your User Content. You represent and warrant that:
            </p>
            <ul>
              <li>You have the right to submit the content</li>
              <li>Your content does not violate any third-party rights (copyright, privacy, etc.)</li>
              <li>Your content complies with all applicable laws and regulations</li>
              <li>Your content is appropriate for educational use</li>
            </ul>

            <h3>5.3 Content Moderation</h3>
            <p>
              We reserve the right to review, modify, or remove any User Content that violates these Terms or 
              is otherwise objectionable, at our sole discretion.
            </p>

            <h2>6. Intellectual Property</h2>
            <p>
              The Service, including its original content, features, and functionality, is owned by OECS Content 
              Creator and is protected by international copyright, trademark, patent, trade secret, and other 
              intellectual property laws.
            </p>

            <h2>7. Third-Party Services</h2>
            <p>
              The Service may integrate with third-party services (e.g., Google Classroom, YouTube). Your use 
              of these services is subject to their respective terms and conditions. We are not responsible for 
              the practices of third-party services.
            </p>

            <h2>8. Privacy</h2>
            <p>
              Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy 
              to understand how we collect, use, and protect your information.
            </p>

            <h2>9. Service Availability</h2>
            <p>
              We strive to provide reliable service but do not guarantee that the Service will be available 
              uninterrupted, secure, or error-free. We may modify, suspend, or discontinue the Service at 
              any time with or without notice.
            </p>

            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, OECS Content Creator shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, or any loss of profits or revenues, 
              whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible 
              losses resulting from your use of the Service.
            </p>

            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless OECS Content Creator, its officers, directors, employees, 
              and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) 
              arising out of your use of the Service, your User Content, or your violation of these Terms.
            </p>

            <h2>12. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the Service immediately, without prior 
              notice, for any reason, including breach of these Terms. Upon termination, your right to use 
              the Service will cease immediately.
            </p>

            <h2>13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes 
              by posting the updated Terms on this page. Your continued use of the Service after changes 
              constitutes acceptance of the new Terms.
            </p>

            <h2>14. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Eastern Caribbean, 
              without regard to its conflict of law provisions.
            </p>

            <h2>15. Contact Information</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <p>
              <strong>OECS Content Creator</strong><br />
              Email: support@oecslearning.org<br />
              Website: https://contentmaker.oecslearning.org
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

