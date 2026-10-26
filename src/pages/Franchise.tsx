import { FranchiseMerchantsTab } from "@/components/franchise/FranchiseMerchantsTab";
import { FranchisePageShell } from "@/components/franchise/FranchisePageShell";

/**
 * Franchise → Établissements : établissements de la franchise, visibilité sur
 * le hub, ajout et retrait. Entrée par défaut du menu Franchise.
 */
export default function Franchise() {
  return (
    <FranchisePageShell
      title="Établissements"
      description="Les établissements de la franchise et leur présence sur le hub."
    >
      {({ franchiseId, detail }) => <FranchiseMerchantsTab key={franchiseId} detail={detail} />}
    </FranchisePageShell>
  );
}
