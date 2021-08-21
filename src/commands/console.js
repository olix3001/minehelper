const { goals } = require('mineflayer-pathfinder');
const signale = require('signale');
const { GoalBlock } = goals;

module.exports = (program) => {
    program
        .command('console')
        .description('join and run a console for commands')
        .action(async (options) => {
            //const { bot } = await require('../client').create(program.opts());

            program.commands.forEach(element => {
                const name = element_name;
                const action = element._actionHandler;
            });
        });
}