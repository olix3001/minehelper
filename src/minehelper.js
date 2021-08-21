const fs = require('fs');
const path = require('path');
const commander = require('commander');
const program = new commander.Command();

// laod all commands from the file
for(let f of fs.readdirSync(path.join(__dirname, 'commands'))) {
    require(path.join(__dirname, 'commands', path.parse(f).name))(program);
}

// add all options for client
const settings = require('../settings.json');
program
    .option('-u, --username <username>', 'client username', settings.username)
    .option('--password <password>', 'client password (null = offline mode)', settings.password)
    .option('-v, --version <version>', 'server version (null = automatic)', settings.version)
    .option('-h, --host <host>', 'server ip', settings.host)
    .option('-p, --port <port>', 'server port', settings.port);

// execute program
program.parse(process.argv);