import '@/components/opp/opp.css';
import { oppFontClasses } from '@/lib/opp-fonts';
import { createClient } from '@/lib/supabase/server';
import type { Deal, Vendor } from '@/lib/types';
import { VendorsView } from './vendors-view';

export default async function VendorsPage() {
  const supabase = await createClient();
  const [{ data: vendors }, { data: deals }] = await Promise.all([
    supabase.from('vendors').select('*').order('name').returns<Vendor[]>(),
    supabase.from('deals').select('id, title, customer_name, product, vendor_quotes').returns<Pick<Deal, 'id' | 'title' | 'customer_name' | 'product' | 'vendor_quotes'>[]>()
  ]);

  // How many opportunities quote each vendor (matched on the vendor name or an alias).
  const quoteCounts: Record<string, number> = {};
  (vendors ?? []).forEach((v) => {
    const names = [v.name, ...v.aliases].map((n) => n.toLowerCase());
    quoteCounts[v.id] = (deals ?? []).filter((d) =>
      d.vendor_quotes.some((q) => names.some((n) => q.vendor.toLowerCase().includes(n)))
    ).length;
  });

  return (
    <div className={oppFontClasses}>
      <VendorsView vendors={vendors ?? []} quoteCounts={quoteCounts} />
    </div>
  );
}
