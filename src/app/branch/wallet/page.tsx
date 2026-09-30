"use client";

import LedgerView from "@/components/branch/LedgerView";

export default function WalletPage() {
  return (
    <LedgerView
      title="My Wallet"
      subtitle="Cash you hold as a teller: funding, deposits collected, and payouts."
      endpoint="/api/tellers/me/ledger"
      selfView
    />
  );
}