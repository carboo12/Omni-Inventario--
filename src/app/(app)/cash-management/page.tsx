import { getUsers } from "@/lib/actions/users";
import CashManagementClient from "./client";

export default async function CashManagementPage() {
    const result = await getUsers();
    const users = result.success ? result.data : [];

    return <CashManagementClient initialUsers={users || []} />;
}
