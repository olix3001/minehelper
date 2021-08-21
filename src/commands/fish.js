const { goals } = require('mineflayer-pathfinder');
const signale = require('signale');
const { GoalBlock } = goals;

module.exports = (program) => {
    program
        .command('fish')
        .description('bot will go to the specified location, wait to get a fishing rod and fish')
        .option('-o, --owner <owner>', 'bot will go to this player position on start', null)
        .option('-c, --coordinates <coordinates>', 'coordinates to afk on ("<x> <y> <z> <yaw> <pitch>")', null)
        .action(async (options) => {
            const { bot, mcData } = await require('../client').create(program.opts());

            var position;
            var rotation;

            if (options.owner != null) {
                if (!(options.owner in bot.players)) {
                    signale.error(`there is no player named '${owner}'`);
                    bot.quit('error');
                    return;
                } else if (bot.players[options.owner].entity == undefined) {
                    signale.error(`player '${options.owner}' is out of render distance... use -c "<x> <y> <z> <yaw> <pitch>" to continue`);
                    bot.quit('error');
                    return;
                }

                const ownerP = bot.players[options.owner]; // get owner player

                // get position where to go
                position = ownerP.entity.position;
                rotation = [ownerP.entity.pitch, ownerP.entity.yaw];
            } else if (options.coordinates != null) {
                const coordinates = options.coordinates.split(' ');
                position = { x: parseInt(coordinates[0]), y: parseInt(coordinates[1]), z: parseInt(coordinates[2]) };
                rotation = [parseInt(coordinates[3]), parseInt(coordinates[4])];
            } else {
                signale.error('either --owner or --coordinates must not be null');
                bot.quit('error');
                return;
            }

            // go to player
            signale.info('going to the fishing location');
            await bot.pathfinder.goto(new GoalBlock(position.x, position.y, position.z));
            await bot.look(rotation[1], rotation[0]);
            await bot.setQuickBarSlot(0);
            if (bot.heldItem == null || bot.heldItem.name != 'fishing_rod') {
                if (bot.heldItem != null) await bot.tossStack(bot.heldItem);
                signale.pending('throw a fishing rod');
                await require('../utils/basicUtils').waitForEvent(bot, 'heldItemChanged');
            }


            signale.success('bot is now fishing');
            // fish
            while (true) {
                await bot.fish();
                signale.info('fishing success');
            }

        });
}