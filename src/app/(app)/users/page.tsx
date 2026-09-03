import { getUsers } from "@/lib/actions/users";
import UsersClient from "./client";

export default async function UsersPage() {
    const result = await getUsers();
    const users = result.success ? result.data : [];

    return <UsersClient initialUsers={users || []} />;
}
