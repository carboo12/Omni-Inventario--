import { getQuotes } from "@/lib/actions/quotations";
import QuotationsClient from "./client";

export default async function QuotationsPage() {
    const result = await getQuotes();
    const quotes = (result.success ? result.data : []) as any[];

    return <QuotationsClient initialQuotes={quotes || []} />;
}
