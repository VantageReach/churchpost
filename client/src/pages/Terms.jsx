export default function Terms() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: May 19, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using ChurchPost ("the Service") at churchpost.social, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.</p>
            <p className="mt-3">ChurchPost is operated by ChurchPost ("we," "our," or "us"). These Terms apply to all users, including church administrators, staff, and any other individuals who access the Service on behalf of an organization.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>ChurchPost is a social media scheduling and management platform designed for churches and faith-based organizations. The Service allows users to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Schedule and publish posts to connected social media platforms including Facebook, Instagram, YouTube, and TikTok</li>
              <li>Generate AI-powered content suggestions for social media posts</li>
              <li>Sync events and service information from Planning Center</li>
              <li>Manage media assets including images and videos</li>
              <li>Collaborate with team members within an organization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Account Registration and Security</h2>
            <p>To use ChurchPost, you must create an account through our authentication provider, Clerk. You agree to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Provide accurate and complete information when creating your account</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly notify us of any unauthorized use of your account</li>
              <li>Accept responsibility for all activity that occurs under your account</li>
            </ul>
            <p className="mt-3">Each organization on ChurchPost operates as a separate workspace. The first user to join an organization is designated as the Organization Administrator and may invite additional team members.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
            <p>You agree to use ChurchPost only for lawful purposes and in compliance with these Terms. You agree NOT to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Use the Service to post content that is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
              <li>Violate any applicable local, national, or international laws or regulations</li>
              <li>Infringe the intellectual property rights of others</li>
              <li>Use the Service to send spam or unsolicited communications</li>
              <li>Attempt to gain unauthorized access to any part of the Service or its related systems</li>
              <li>Use the Service in any way that could damage, disable, or impair the Service</li>
              <li>Use automated scripts or bots to access the Service outside of our published API</li>
              <li>Violate the terms of service of any connected social media platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Connected Social Media Platforms</h2>
            <p>ChurchPost integrates with third-party social media platforms. By connecting these platforms, you:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Authorize ChurchPost to access and publish content to those platforms on your behalf</li>
              <li>Represent that you have the authority to connect those platform accounts to ChurchPost</li>
              <li>Agree to comply with the terms of service of each connected platform, including Meta's Terms of Service, Google's Terms of Service, and TikTok's Terms of Service</li>
              <li>Acknowledge that ChurchPost is not responsible for the availability, policies, or actions of third-party platforms</li>
            </ul>
            <p className="mt-3">You may disconnect any social media platform at any time through the Settings page. Disconnecting will revoke ChurchPost's access to that platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Content and Intellectual Property</h2>
            <h3 className="text-base font-semibold text-gray-800 mb-2">Your Content</h3>
            <p>You retain ownership of all content you create, upload, or publish through ChurchPost ("Your Content"). By using the Service, you grant ChurchPost a limited, non-exclusive license to store, process, and transmit Your Content solely to provide the Service.</p>

            <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">AI-Generated Suggestions</h3>
            <p>Content suggestions generated by our AI features are provided as a starting point and may be edited or rejected before publishing. You are responsible for reviewing and approving all content before it is published to social media platforms.</p>

            <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">Our Intellectual Property</h3>
            <p>ChurchPost and its original content, features, and functionality are owned by us and are protected by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our Service without express written permission.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Subscription and Billing</h2>
            <p>ChurchPost may offer subscription plans with varying features and pricing. If you subscribe to a paid plan:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>You authorize us to charge the applicable fees to your payment method</li>
              <li>Subscription fees are billed in advance and are non-refundable except as required by law</li>
              <li>We reserve the right to change pricing with reasonable notice</li>
              <li>Failure to pay may result in suspension or termination of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Privacy</h2>
            <p>Your use of ChurchPost is also governed by our <a href="/privacy" className="text-indigo-600 hover:text-indigo-800">Privacy Policy</a>, which is incorporated into these Terms by reference. By using the Service, you consent to the data practices described in our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Disclaimers and Limitation of Liability</h2>
            <h3 className="text-base font-semibold text-gray-800 mb-2">Disclaimer of Warranties</h3>
            <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>

            <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">Limitation of Liability</h3>
            <p>TO THE FULLEST EXTENT PERMITTED BY LAW, CHURCHPOST SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.</p>
            <p className="mt-3">Our total liability for any claims arising from these Terms or your use of the Service shall not exceed the amount you paid to us in the twelve months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless ChurchPost and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses arising from your use of the Service, Your Content, your violation of these Terms, or your violation of any rights of a third party.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time if you violate these Terms or engage in conduct that we determine is harmful to the Service or other users. You may also terminate your account at any time by contacting us.</p>
            <p className="mt-3">Upon termination, your right to use the Service ceases immediately. We may retain certain information as required by law or for legitimate business purposes as described in our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify you of significant changes by posting the updated Terms on this page with a revised date. Your continued use of the Service after changes take effect constitutes your acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Governing Law</h2>
            <p>These Terms are governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved in the courts of Texas.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Contact Us</h2>
            <p>If you have questions about these Terms, please contact us at:</p>
            <p className="mt-3">
              <strong>ChurchPost</strong><br />
              Email: legal@churchpost.social<br />
              Website: churchpost.social
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <a href="/privacy" className="text-sm text-indigo-600 hover:text-indigo-800">View Privacy Policy →</a>
        </div>
      </div>
    </div>
  );
}
