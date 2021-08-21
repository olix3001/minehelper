const { goals } = require('mineflayer-pathfinder');
const signale = require('signale');
const { GoalBlock } = goals;

module.exports = (program) => {
    program
        .command('afk')
        .description('bot will go to the specified location')
        .option('-o, --owner <owner>', 'bot will go to this player position on start', null)
        .option('-c, --coordinates <coordinates>', 'coordinates to afk on', null)
        .action(async (options) => {
            const { bot } = await require('../client').create(program.opts());


            var position;
            var rotation;

            if (options.owner != null) {
                if (!(options.owner in bot.players)) {
                    signale.error(`there is no player named '${owner}'`);
                    bot.quit('error');
                    return;
                } else if (bot.players[options.owner].entity == undefined) {
                    signale.error(`player '${options.owner}' is out of render distance... use -c "<x> <y> <z>" to continue`);
                    bot.quit('error');
                    return;
                }

                const ownerP = bot.players[options.owner]; // get owner player

                // get position where to go
                position = ownerP.entity.position;
                rotation = [ownerP.entity.pitch, ownerP.entity.yaw];
            } else if (options.coordinates != null) {
                rotation = [0, 0];
                const coordinates = options.coordinates.split(' ');
                position = { x: parseInt(coordinates[0]), y: parseInt(coordinates[1]), z: parseInt(coordinates[2]) };
            } else {
                signale.error('either --owner or --coordinates must not be null');
                bot.quit('error');
                return;
            }

            // go to player
            signale.info('going to the afk location');
            await bot.pathfinder.setGoal(new GoalBlock(position.x, position.y, position.z), true);
            await bot.look(rotation[1], rotation[0]);

            signale.success('bot is now afking');
        });
}