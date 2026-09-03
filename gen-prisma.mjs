import { execSync } from "child_process";
import fs from "fs";

try {
    const out = execSync("npx prisma generate", { stdio: 'pipe', encoding: 'utf-8', cwd: process.cwd() });
    fs.writeFileSync("generate_out.txt", "SUCCESS:\n" + out);
} catch (e) {
    fs.writeFileSync("generate_out.txt", `ERROR: ${e.message}\nSTDOUT: ${e.stdout}\nSTDERR: ${e.stderr}`);
}
