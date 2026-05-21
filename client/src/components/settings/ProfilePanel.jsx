import { UserProfile } from "@clerk/clerk-react";

export default function ProfilePanel() {
  return (
    <div className="-m-4 lg:-m-8">
      <UserProfile
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none border-0 rounded-2xl w-full",
            navbar: "hidden",
            navbarMobileMenuButton: "hidden",
            pageScrollBox: "p-4 lg:p-6",
          },
        }}
      />
    </div>
  );
}
