import { getAllCustomers } from "@/lib/actions/customers";
import CreditManagementClient from "./client";

export default async function CreditManagementPage() {
    const customers = await getAllCustomers();
    
    return (
        <div className="container mx-auto py-6">
            <CreditManagementClient initialCustomers={customers} />
        </div>
    );
}
