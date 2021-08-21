const { bgYellow } = require("chalk");
const inquirer = require("inquirer");
const { goals } = require("mineflayer-pathfinder");
const basicUtils = require("../utils/basicUtils");

var swordmap = {};

async function ensureSword(bot) {
    if (!(bot in swordmap)) {
        for (item of bot.inventory.items()) {
            if (item.name.includes('sword') || item.name.includes('axe')) swordmap[bot] = item;
        }
    }
    if (bot in swordmap)
        bot.equip(swordmap[bot], 'hand');
}

async function attemptAttack(bot, entity) {
    const shield = await hasShield(bot);
    if (entity.position.distanceTo(bot.entity.position) < 6) {
        // ensure that bot is holding a weapon
        ensureSword(bot);

        // jump and wait for perfect timing
        await bot.setControlState('jump', true);
        await bot.setControlState('jump', false);
        await basicUtils.wait(400);

        // deactivate shield
        if (shield) await bot.deactivateItem();

        await basicUtils.wait(100);

        // attack
        await bot.attack(entity);

        // activate shield
        if (shield) {
            await basicUtils.wait(100);
            await bot.activateItem(true);
        }
    } else {
        if (shield && !bot.usingHeldItem) await bot.deactivateItem();
    }
}

async function hasShield(bot) {
    const slot = bot.inventory.slots[await bot.getEquipmentDestSlot('off-hand')];
    if (!slot) return false;

    return slot.name.includes('shield');
}

module.exports = {
    equip: async (bot) => {
        var stop = false;
        bot.inventory.on('updateSlot', async (slot, oldItem, newItem) => {
            if (stop) return;
            if (Object.keys(oldItem).length != 0 || newItem == null || newItem.name == undefined) return;

            // do something else with different types of items
            if (newItem.name == 'shield') {
                bot.equip(bot.inventory.slots[slot], 'off-hand');
            } else if (newItem.name.includes('helmet')) {
                bot.equip(bot.inventory.slots[slot], 'head');
            } else if (newItem.name.includes('chestplate')) {
                bot.equip(bot.inventory.slots[slot], 'torso');
            } else if (newItem.name.includes('leggings')) {
                bot.equip(bot.inventory.slots[slot], 'legs');
            } else if (newItem.name.includes('boots')) {
                bot.equip(bot.inventory.slots[slot], 'feet');
            } else if (newItem.name.includes('sword') || newItem.name.includes('axe')) {
                bot.equip(bot.inventory.slots[slot], 'hand');
                swordmap[bot] = bot.inventory.slots[slot];
            }
        });

        return new Promise(async resolve => {
            await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'done',
                    message: 'press enter when ready',
                    default: true
                }
            ]);
            stop = true;
            resolve();
        })
    },

    hunt: async (bot, entity) => {

        bot.pathfinder.setGoal(new goals.GoalFollow(entity, 3), true);
        var interval = setInterval(async () => {
            attemptAttack(bot, entity)
        }, 1000);
        var lookInterval = setInterval(async () => {
            if (entity.position.distanceTo(bot.entity.position) < 7)
                bot.lookAt(entity.position, true)
        }, 100);

        return new Promise(async resolve => {
            bot.on('entityDead', (dead) => {
                if (dead.uuid == entity.uuid) {
                    clearInterval(interval);
                    clearInterval(lookInterval);
                    resolve();
                }
            })
        })
    },
}