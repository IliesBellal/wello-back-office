import { FranchiseMembersTab } from "@/components/franchise/FranchiseMembersTab";
import { FranchisePageShell } from "@/components/franchise/FranchisePageShell";

/** Franchise → Gestionnaires : propriétaires et gestionnaires de la franchise. */
export default function FranchiseManagers() {
  return (
    <FranchisePageShell title="Gestionnaires" description="Les personnes qui gèrent la franchise et leur rôle.">
      {({ franchiseId, detail, leave }) => <FranchiseMembersTab key={franchiseId} detail={detail} onLeft={leave} />}
    </FranchisePageShell>
  );
}
