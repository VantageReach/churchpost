export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: May 19, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>ChurchPost ("we," "our," or "us") is a social media scheduling platform designed for churches and faith-based organizations. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service at churchpost.social.</p>
            <p className="mt-3">By using ChurchPost, you agree to the collection and use of information in accordance with this policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-semibold text-gray-800 mb-2">Account Information</h3>
            <p>When you create an account, we collect your name, email address, and authentication credentials managed through Clerk, our identity provider.</p>

            <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">Social Media Tokens</h3>
            <p>To publish content on your behalf, we collect and securely store OAuth access tokens for connected platforms including Facebook, Instagram, YouTube, and TikTok. These tokens are encrypted at rest and are used only to publish content you explicitly schedule or approve.</p>

            <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">Content and Media</h3>
            <p>We store post content (captions, text, hashtags) and media files (images and videos) you upload. Media files are stored in Cloudflare R2 cloud storage.</p>

            <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">Planning Center Data</h3>
            <p>If you connect Planning Center, we access your organization's event and service data to help generate content suggestions. We store only the event titles, dates, and descriptions needed to power this feature.</p>

            <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">Usage Data</h3>
            <p>We collect information about how you use the service, including pages visited, features used, and actions taken, to improve our product and diagnose issues.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To publish scheduled posts to connected social media platforms on your behalf</li>
              <li>To generate AI-powered content suggestions based on your calendar and settings</li>
              <li>To sync Planning Center events and service information</li>
              <li>To send transactional emails related to your account and post status</li>
              <li>To provide customer support and respond to inquiries</li>
              <li>To improve, maintain, and secure the platform</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. How We Share Your Information</h2>
            <p>We do not sell your personal information. We share data only in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Social Media Platforms:</strong> Content and media you schedule is transmitted to Facebook, Instagram, YouTube, and TikTok using their official APIs when you authorize publishing.</li>
              <li><strong>Service Providers:</strong> We use third-party services including Clerk (authentication), Cloudflare R2 (media storage), Neon (database), Railway (hosting), and Anthropic (AI content generation). Each provider processes data only as necessary to provide their service.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal process.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p>We retain your account data and post history for as long as your account is active. Media files stored in Cloudflare R2 are retained until you delete them or close your account. Social media access tokens are deleted when you disconnect a platform or close your account.</p>
            <p className="mt-3">You may request deletion of your data at any time by contacting us at the address below.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Security</h2>
            <p>We implement industry-standard security measures including encryption of sensitive data at rest (including all OAuth tokens), HTTPS for all data in transit, and access controls limiting who can access your data. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Disconnect any connected social media platform at any time through Settings</li>
              <li>Export your post data</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us at privacy@churchpost.social.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children's Privacy</h2>
            <p>ChurchPost is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date. Your continued use of the service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us at:</p>
            <p className="mt-3">
              <strong>ChurchPost</strong><br />
              Email: privacy@churchpost.social<br />
              Website: churchpost.social
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <a href="/terms" className="text-sm text-indigo-600 hover:text-indigo-800">View Terms of Service →</a>
        </div>
      </div>
    </div>
  );
}
