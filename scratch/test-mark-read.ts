import { markAllAsRead, getNotifications } from '../src/lib/actions/notifications';

async function main() {
    console.log("Before markAllAsRead:");
    const before = await getNotifications();
    console.log("Unread count before:", before.length);

    await markAllAsRead();

    console.log("After markAllAsRead:");
    const after = await getNotifications();
    console.log("Unread count after:", after.length);
}

main().catch(console.error);
