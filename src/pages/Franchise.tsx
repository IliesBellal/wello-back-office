import { useSearchParams } from "react-router-dom";
import { TabSystem } from "@/components/shared";
import { FranchiseMembersTab } from "@/components/franchise/FranchiseMembersTab";
import { FranchiseMerchantsTab } from "@/components/franchise/FranchiseMerchantsTab";
import { FranchisePageShell } from "@/components/franchise/FranchisePageShell";
import { FranchiseSettingsTab } from "@/components/franchise/FranchiseSettingsTab";

const TABS = [
  { id: "etablissements", label: "Établissements" },
  { id: "parametres", label: "Paramètres" },
  { id: "gestionnaires", label: "Gestionnaires" },
];

/**
 * Franchise → Gestion : établissements de la franchise, paramètres généraux
 * (nom, logo, suppression) et gestionnaires. L'onglet affiché est dans l'URL
 * (?tab=), comme la franchise (?f=), pour qu'un lien ouvre le bon onglet.
 */
export default function Franchise() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const activeTab = TABS.some((t) => t.id === requested) ? (requested as string) : "etablissements";

  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "etablissements") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <FranchisePageShell title="Gestion" description="Les établissements de la franchise, ses paramètres et ses gestionnaires.">
      {({ franchiseId, detail, leave }) => (
        <TabSystem
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setTab}
          renderContent={(tab) => {
            if (tab === "parametres") return <FranchiseSettingsTab key={franchiseId} detail={detail} onDeleted={leave} />;
            if (tab === "gestionnaires") return <FranchiseMembersTab key={franchiseId} detail={detail} onLeft={leave} />;
            return <FranchiseMerchantsTab key={franchiseId} detail={detail} />;
          }}
        />
      )}
    </FranchisePageShell>
  );
}
