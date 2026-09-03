import bcrypt from 'bcryptjs';

const hash = '$2b$10$1lgmWXm9eMwDOdZ7kx.m.egG9U6BmEYu/bHiAdVf7AJh2N5QBB0ta';
const password = '123456';

async function verify() {
    const isValid = await bcrypt.compare(password, hash);
    console.log(`Password '123456' matches hash: ${isValid}`);
}

verify().catch(console.error);
