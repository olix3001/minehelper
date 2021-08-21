const { goals } = require('mineflayer-pathfinder');
const signale = require('signale');
const { GoalBlock } = goals;
const pvp = require('../modules/pvpModule');

module.exports = (program) => {
    program
        .command('kill <player>')
        .option('-i, --instant', 'attack without equipment phase')
        .description('kill specified player (must be in the render distance)')
        .action(async (player, options) => {
            const { bot } = await require('../client').create(program.opts());

            if (bot.players[player] == undefined || bot.players[player].entity == undefined) {
                signale.error(`player '${player}' is either not logged in or not in the render distance`)
                bot.quit('error');
                return;
            }

            if (!options.instant) await pvp.equip(bot);

            await pvp.hunt(bot, bot.players[player].entity);
            signale.success('target eliminated');
            bot.quit('done');
        });
}