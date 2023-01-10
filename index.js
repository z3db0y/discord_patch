const fs = require("fs");
const path = require("path");
const asar = require("@electron/asar");
const { exec } = require('child_process');

function findDiscordCore(discordInstall) {
    let dir = fs.readdirSync(discordInstall.path);
    let appDirname = dir.find(d => d.startsWith("app-"));
    if(!appDirname) return null;
    let app = path.join(discordInstall.path, appDirname);
    let modules = path.join(app, "modules");
    let modulesDir = fs.readdirSync(modules);
    let coreDirname = modulesDir.find(d => d.startsWith("discord_desktop_core-"));
    if(!coreDirname) return null;
    let coreDir = path.join(modules, coreDirname, 'discord_desktop_core');
    if(!fs.existsSync(coreDir)) return null;
    return path.join(coreDir, 'core.asar');
}

function findDiscordInstall() {
    const STABLE = process.env.LOCALAPPDATA + "\\Discord";
    const PTB = process.env.LOCALAPPDATA + "\\DiscordPTB";
    const CANARY = process.env.LOCALAPPDATA + "\\discordcanary";
    let found = [];

    if(fs.existsSync(STABLE)) found.push({ channel: "STABLE", path: STABLE });
    if(fs.existsSync(PTB)) found.push({ channel: "PTB", path: PTB });
    if(fs.existsSync(CANARY)) found.push({ channel: "CANARY", path: CANARY });
    return found;
}

async function inject() {
    console.log('🔎 Searching for Discord...');
    let discordInstall = findDiscordInstall();
    if(!discordInstall.length) return console.log('❌ Discord not found.');
    let install = discordInstall[0];
    if(discordInstall.length == 1) console.log('✅ Discord install found! Channel: ' + discordInstall.channel);
    else {
        let str = '';
        discordInstall.forEach(i => {
            switch(i.channel) {
                case 'STABLE': str += '[s]table / '; break;
                case 'PTB': str += '[p]tb / '; break;
                case 'CANARY': str += '[c]anary / '; break;
            }
        });
        str = str.slice(0, -2);
        process.stdout.write('✅ Multiple discord installs found. Please select which one to patch: ' + str);

        let channel = await new Promise(resolve => {
            let handler = function (text) {
                if(text.toLowerCase() == 's') (console.log(text), process.stdin.off('data', handler), resolve('STABLE'));
                if(text.toLowerCase() == 'p') (console.log(text), process.stdin.off('data', handler), resolve('PTB'));
                if(text.toLowerCase() == 'c') (console.log(text), process.stdin.off('data', handler), resolve('CANARY'));
            };
            process.stdin.on('data', handler);
        });
        install = discordInstall.find(i => i.channel == channel);
    }
    console.log('🔎 Searching for Discord core...');
    let core = findDiscordCore(install);
    if(!core) return console.log('❌ Discord core not found.');
    console.log('✅ Discord core found! Path: ' + core);

    if(fs.existsSync(core + '.bak')) return console.log('❌ Discord is already patched. You can restore it by choosing the restore option.');

    console.log('📦 Backing up Discord core...');
    fs.copyFileSync(core, core + '.bak');
    console.log('✅ Discord core backed up! Path: ' + core + '.bak');

    console.log('📦 Injecting Discord core...');
    asar.extractAll(core, core.replace('core.asar', 'core_unpack'));
    let preload = fs.readFileSync(path.join(core.replace('core.asar', 'core_unpack'), 'app', 'mainScreenPreload.js'), 'utf8');
    let injectCode = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
    preload += '\n\n' + injectCode;
    fs.writeFileSync(path.join(core.replace('core.asar', 'core_unpack'), 'app', 'mainScreenPreload.js'), preload);
    await asar.createPackage(core.replace('core.asar', 'core_unpack'), core);
    fs.rmSync(core.replace('core.asar', 'core_unpack'), { recursive: true });
    console.log('✅ Discord core injected!');

    process.stdout.write('🔁 Restart Discord? (y/n) ');
    let restartDiscord = await new Promise(resolve => {
        let handler = function (text) {
            if(text.toLowerCase() == 'y') (console.log(text), process.stdin.off('data', handler), resolve(true));
            if(text.toLowerCase() == 'n') (console.log(text), process.stdin.off('data', handler), resolve(false));
        };
        process.stdin.on('data', handler);
    });
    
    if(restartDiscord) switch(process.platform) {
        case 'win32':
            exec('taskkill /f /im Discord.exe');
            exec('start "" "' + install.path + '\\Update.exe" --processStart Discord.exe');
            break;
        case 'darwin':
            exec('killall Discord');
            exec('open -a "' + install.path + '"');
            break;
        case 'linux':
            exec('killall Discord');
            exec('"' + install.path + '/discord"');
            break;
    }
}

async function restore() {
    console.log('🔎 Searching for Discord...');
    let discordInstall = findDiscordInstall();
    if(!discordInstall.length) return console.log('❌ Discord not found.');
    let install = discordInstall[0];
    if(discordInstall.length == 1) console.log('✅ Discord install found! Channel: ' + discordInstall.channel);
    else {
        let str = '';
        discordInstall.forEach(i => {
            switch(i.channel) {
                case 'STABLE': str += '[s]table / '; break;
                case 'PTB': str += '[p]tb / '; break;
                case 'CANARY': str += '[c]anary / '; break;
            }
        });
        str = str.slice(0, -2);
        process.stdout.write('✅ Multiple discord installs found. Please select which one to patch: ' + str);

        let channel = await new Promise(resolve => {
            let handler = function (text) {
                if(text.toLowerCase() == 's') (console.log(text), process.stdin.off('data', handler), resolve('STABLE'));
                if(text.toLowerCase() == 'p') (console.log(text), process.stdin.off('data', handler), resolve('PTB'));
                if(text.toLowerCase() == 'c') (console.log(text), process.stdin.off('data', handler), resolve('CANARY'));
            };
            process.stdin.on('data', handler);
        });
        install = discordInstall.find(i => i.channel == channel);
    }
    console.log('🔎 Searching for Discord core...');
    let core = findDiscordCore(install);
    if(!core) return console.log('❌ Discord core not found.');
    console.log('✅ Discord core found! Path: ' + core);

    if(!fs.existsSync(core + '.bak')) return console.log('❌ Discord is not patched. You can patch it by choosing the inject option.');

    console.log('📦 Restoring Discord core...');
    fs.copyFileSync(core + '.bak', core);
    fs.unlinkSync(core + '.bak');
    console.log('✅ Discord core restored!');

    process.stdout.write('🔁 Restart Discord? (y/n) ');
    let restartDiscord = await new Promise(resolve => {
        let handler = function (text) {
            if(text.toLowerCase() == 'y') (console.log(text), process.stdin.off('data', handler), resolve(true));
            if(text.toLowerCase() == 'n') (console.log(text), process.stdin.off('data', handler), resolve(false));
        };
        process.stdin.on('data', handler);
    });
    
    if(restartDiscord) switch(process.platform) {
        case 'win32':
            exec('taskkill /f /im Discord.exe');
            exec('start "" "' + install.path + '\\Update.exe" --processStart Discord.exe');
            break;
        case 'darwin':
            exec('killall Discord');
            exec('open -a "' + install.path + '"');
            break;
        case 'linux':
            exec('killall Discord');
            exec('"' + install.path + '/discord"');
            break;
    }
}

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.setRawMode(true);
let popup = true;
let donePopup = false;
process.stdin.on('data', async function (text) {
    if (text === '\u0003') {
        process.exit();
    } else if(popup) {
        if(text.toLowerCase() == 'i') (console.log(text), popup = false, await inject(), process.stdout.write('[Process completed. Press [ENTER] to exit]'), donePopup = true);
        else if(text.toLowerCase() == 'r') (console.log(text), popup = false, await restore(), process.stdout.write('[Process completed. Press [ENTER] to exit]'), donePopup = true);
    } else if(donePopup && text == '\r') process.exit();
});

process.title = "Discord Patch (by ZEDBOY#0474)";
console.log('Discord Quality of Life Patch (by ZEDBOY#0474)');
process.stdout.write('(Select action: [i]nject / [r]estore): ');