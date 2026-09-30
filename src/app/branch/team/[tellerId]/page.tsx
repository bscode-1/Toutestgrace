"use client";

import { useParams } from "next/navigation";
import LedgerView from "@/components/branch/LedgerView";

export default function TellerLedgerPage() {
  const { tellerId } = useParams<{ tellerId: string }>();
  return (
    <LedgerView
      title="Teller Ledger"
      subtitle="Every movement of cash for this teller."
      endpoint={tellerId ? `/api/tellers/${tellerId}/ledger` : null}
      backHref="/branch/team"
    />
  );
}
