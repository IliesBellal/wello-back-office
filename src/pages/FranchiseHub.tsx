import { FranchiseAppearanceTab } from "@/components/franchise/FranchiseAppearanceTab";
import { FranchiseHubLink } from "@/components/franchise/FranchiseHubLink";
import { FranchisePageShell } from "@/components/franchise/FranchisePageShell";

/** Franchise → Hub : lien et QR code du hub, apparence (logo, bannière, couleur, description). */
export default function FranchiseHub() {
  return (
    <FranchisePageShell title="Hub" description="La page commune où vos clients choisissent leur établissement.">
      {({ franchiseId, detail, leave }) => (
        <div className="space-y-6">
          <FranchiseHubLink hubUrl={detail.hub_url} slug={detail.franchise.slug} />
          <FranchiseAppearanceTab key={franchiseId} detail={detail} onDeleted={leave} />
        </div>
      )}
    </FranchisePageShell>
  );
}
