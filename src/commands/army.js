const { goals } = require('mineflayer-pathfinder');
const signale = require('signale');
const { GoalBlock } = goals;
const pvp = require('../modules/pvpModule');

module.exports = (program) => {
    program
        .command('army <size> <player>')
        .option('-m, --meeting <place>', 'place (<x> <z>) where all bots will set in a line (x+(i*2)) at the begining', null)
        .option('-i, --instant', 'attack without equipment phase')
        .description('kill specified player with an army (must be in the render distance)')
        .action(async (size, player, options) => {
            var aSize = parseInt(size);

            var meeting = null;

            if (options.meeting) {
                var p = options.meeting.split(' ');
                meeting = {
                    x: parseInt(p[0]),
                    z: parseInt(p[1])
                };
            }

            var createWarrior = async (index) => {
                var opts = { ...program.opts() }
                opts.username = opts.username + '-' + index;
                const { bot } = await require('../client').create(opts);


                if (bot.players[player] == undefined || bot.players[player].entity == undefined) {
                    signale.error(`player '${player}' is either not logged in or not in the render distance`)
                    bot.quit('error');
                    return;
                }

                if (meeting != null) {
                    await bot.pathfinder.goto(new goals.GoalXZ(meeting.x + (index * 2), meeting.z));
                    await bot.look(0, 0, true);
                }

                if (!options.instant) await pvp.equip(bot);

                await pvp.hunt(bot, bot.players[player].entity);
                signale.success('target eliminated');
                bot.quit('done');
            };

            signale.info('preparing');
            for (let i = 0; i < aSize; i++) {
                createWarrior(i);
            }
        });
}