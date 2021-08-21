const mineflayer = require('mineflayer');
const fs = require('fs');
const { pathfinder, Movements } = require('mineflayer-pathfinder');

module.exports = {
    create: (settings) => {
        return new Promise((resolve) => {
            var client = mineflayer.createBot(settings);

            client.loadPlugin(pathfinder);
            client.once('spawn', () => {
                var mcData = require('minecraft-data')(client.version);
                var movements = new Movements(client, mcData);

                client.pathfinder.setMovements(movements);
                resolve({ bot: client, mcData: mcData });
            })
        });
    },
}