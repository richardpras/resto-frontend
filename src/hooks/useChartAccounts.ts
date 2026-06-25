import { useEffect, useState } from "react";
import { listAccounts, type AccountApiRow } from "@/lib/api-integration/accountingEndpoints";

let cachedAccounts: AccountApiRow[] | null = null;
let inflight: Promise<AccountApiRow[]> | null = null;

export function clearChartAccountsCache(): void {
  cachedAccounts = null;
  inflight = null;
}

export function setChartAccountsCache(rows: AccountApiRow[]): void {
  cachedAccounts = rows;
}

function fetchChartAccounts(): Promise<AccountApiRow[]> {
  if (cachedAccounts !== null) {
    return Promise.resolve(cachedAccounts);
  }
  if (inflight !== null) {
    return inflight;
  }
  inflight = listAccounts()
    .then((rows) => {
      cachedAccounts = rows;
      return rows;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useChartAccounts(): { accounts: AccountApiRow[]; loading: boolean } {
  const [accounts, setAccounts] = useState<AccountApiRow[]>(cachedAccounts ?? []);
  const [loading, setLoading] = useState(cachedAccounts === null);

  useEffect(() => {
    let cancelled = false;
    void fetchChartAccounts()
      .then((rows) => {
        if (!cancelled) {
          setAccounts(rows);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccounts([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { accounts, loading };
}
