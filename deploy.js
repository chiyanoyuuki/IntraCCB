const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const FTP_HOST = "ftp.chcl8760.odns.fr";
const FTP_USER = "chcl8760";
const FTP_PASSWORD = "q8x3-7N5U-WR8}";
const FTP_REMOTE_PATH = "/public_html/intraccb"; // dossier admin
const LOCAL_PATH = path.join(__dirname, "docs"); // dossier build Angular admin
const BROWSER_PATH = path.join(LOCAL_PATH, "browser"); // si nécessaire

// Déplace tout le contenu de browser vers docs
function moveBrowserContent() {
    if (!fs.existsSync(BROWSER_PATH)) return;
    const files = fs.readdirSync(BROWSER_PATH);
    for (const file of files) {
        const src = path.join(BROWSER_PATH, file);
        const dest = path.join(LOCAL_PATH, file);
        fs.renameSync(src, dest);
    }
    fs.rmdirSync(BROWSER_PATH);
}

function gitCommitPush() {
    try {
        execSync("git add .", { stdio: "inherit" });
        execSync('git commit -m "deploy admin"', { stdio: "inherit" });
        execSync("git push", { stdio: "inherit" });
    } catch (err) {
        console.log("Git commit/push ignoré (peut-être pas de changements).");
    }
}

// Supprime tout le contenu d'un dossier distant
async function removeAll(client, dir) {
    const list = await client.list(dir);
    for (const item of list) {
        const remotePath = `${dir}/${item.name}`;
        if (item.isDirectory) {
            await client.removeDir(remotePath);
        } else {
            await client.remove(remotePath);
        }
    }
}

async function uploadDir(client, localDir, remoteDir) {
    const files = fs.readdirSync(localDir);
    for (const file of files) {
        const localPath = path.join(localDir, file);
        const remotePath = `${remoteDir}/${file}`;
        if (fs.lstatSync(localPath).isDirectory()) {
            await client.ensureDir(remotePath);
            await uploadDir(client, localPath, remotePath);
        } else {
            await client.uploadFrom(localPath, remotePath);
        }
    }
}

async function deployAdmin() {
    console.log("Build Angular admin...");
    execSync("ng build --configuration=production --output-path docs --base-href ./", { stdio: "inherit" });

    console.log("Déplacement du contenu de browser vers docs si nécessaire...");
    moveBrowserContent();

    console.log("Commit + push Git...");
    gitCommitPush();

    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        console.log("Connexion FTP...");
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASSWORD,
            secure: false
        });

        console.log("Suppression du contenu actuel de adminccb...");
        await removeAll(client, FTP_REMOTE_PATH);

        console.log("Upload du nouveau build admin...");
        await uploadDir(client, LOCAL_PATH, FTP_REMOTE_PATH);

        console.log("Déploiement admin terminé.");
    } catch (err) {
        console.error(err);
    }
    client.close();
}

deployAdmin();
