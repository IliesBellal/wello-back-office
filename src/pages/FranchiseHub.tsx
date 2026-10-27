import { FranchiseHubSettings } from "@/components/franchise/FranchiseHubSettings";
import { FranchisePageShell } from "@/components/franchise/FranchisePageShell";

/** Franchise → Hub : adresse et QR code, présentation, bandeau d'annonce. */
export default function FranchiseHub() {
  return (
    <FranchisePageShell title="Hub" description="La page commune où vos clients choisissent leur établissement.">
      {({ franchiseId, detail }) => <FranchiseHubSettings key={franchiseId} detail={detail} />}
    </FranchisePageShell>
  );
}
