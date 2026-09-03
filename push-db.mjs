import { execSync } from "child_process";
import fs from "fs";

try {
    console.log("Starting Prisma db push...");
    const cmd = "npx prisma db push --accept-data-loss";
    const result = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
    console.log("SUCCESS");
    fs.writeFileSync("push_result.txt", "SUCCESS:\n" + result);
} catch (e) {
    console.error("FAILED");
    const output = `ERROR: ${e.message}\nSTDOUT: ${e.stdout}\nSTDERR: ${e.stderr}`;
    fs.writeFileSync("push_result.txt", output);
}
