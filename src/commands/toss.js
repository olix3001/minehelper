const { goals } = require('mineflayer-pathfinder');
const signale = require('signale');
const { GoalBlock } = goals;

module.exports = (program) => {
    program
        .command('toss')
        .description('toss all items on the ground')
        .action(async () => {
            const { bot } = await require('../client').create(program.opts());

            for (let item of bot.inventory.items()) {
                await bot.tossStack(item);
            }

            bot.quit('done');
            return;
        });
}