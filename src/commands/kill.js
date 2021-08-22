const { goals } = require('mineflayer-pathfinder');
const signale = require('signale');
const { GoalBlock } = goals;
const pvp = require('../modules/pvpModule');

module.exports = (program) => {
    program
        .command('kill <player>')
        .option('-i, --instant', 'attack without equipment phase')
        .option('-m, --meeting <place>', 'place (<x> <z>) where bot will go before attacking', null)
        .description('kill specified player (must be in the render distance)')
        .action(async (player, options) => {
            const { bot } = await require('../client').create(program.opts());

            if (bot.players[player] == undefined || bot.players[player].entity == undefined) {
                signale.error(`player '${player}' is either not logged in or not in the render distance`)
                bot.quit('error');
                return;
            }

            if (options.meeting) {
                var p = options.meeting.split(' ');
                await bot.pathfinder.goto(new goals.GoalXZ(parseInt(p[0]), parseInt(p[1])))
            }

            if (!options.instant) await pvp.equip(bot);

            bot.on('death', () => {
                bot.quit('dead');
                signale.error('bot died');
            })

            await pvp.hunt(bot, bot.players[player].entity);
            signale.success('target eliminated');
            bot.quit('done');
        });
}