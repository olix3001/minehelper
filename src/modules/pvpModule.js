const { bgYellow } = require("chalk");
const inquirer = require("inquirer");
const { goals } = require("mineflayer-pathfinder");
const { await } = require("signale");
const basicUtils = require("../utils/basicUtils");

var swordmap = {};
var lastSuperEat = {};

async function ensureSword(bot) {
    if (!(bot in swordmap)) {
        for (let item of bot.inventory.items()) {
            if (item.name.includes('sword') || item.name.includes('_axe')) swordmap[bot] = item;
        }
    }
    if (bot in swordmap)
        await bot.equip(swordmap[bot], 'hand');
}

async function eat(bot, selector) {
    await selectFirst(bot, await selector(bot));
    await bot.activateItem();
    await basicUtils.wait(1700);
    await bot.deactivateItem();
    await ensureSword(bot);
}

async function selectFirst(bot, array) {
    if (array.length <= 0) return;
    await bot.equip(array[0], 'hand');
}

async function attemptAttack(bot, entity) {
    const shield = await hasShield(bot);

    // eat if low hp and food
    if (bot.food < 10) {
        if (shield) bot.deactivateItem();
        await eat(bot, food);
        if (shield) bot.activateItem(true);
    }

    // if very low hp then eat super food
    if (bot.health < 8) {
        if (!(bot in lastSuperEat) || lastSuperEat[bot] < Date.now() - 2500) {
            if (shield) bot.deactivateItem();
            await eat(bot, superFood);
            lastSuperEat[bot] = Date.now();
            if (shield) bot.activateItem(true);
        }
    }

    if (entity.position.distanceTo(bot.entity.position) < 6) {
        // ensure that bot is holding a weapon
        await ensureSword(bot);

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

async function food(bot) {
    let food = []
    for (let item of await bot.inventory.items()) {
        if (item.name == 'cooked_beef') food.push(item);
    }
    return food;
}

async function superFood(bot) { // golden apples itd...
    let food = []
    for (let item of await bot.inventory.items()) {
        if (item.name == 'golden_apple') food.push(item);
        else if (item.name == 'enchanted_golden_apple') food.push(item);
    }
    return food;
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

        var stop = false;

        setTimeout(async () => {
            while (true) {
                if (stop) return;
                await attemptAttack(bot, entity);
                await basicUtils.wait(750);
            }
        }, 1000);
        var lookInterval = setInterval(async () => {
            if (entity.position.distanceTo(bot.entity.position) < 7)
                bot.lookAt(entity.position, true)
        }, 100);

        return new Promise(async resolve => {
            bot.on('entityDead', (dead) => {
                if (dead.uuid == entity.uuid) {
                    stop = true;
                    clearInterval(lookInterval);
                    resolve();
                }
            })
        })
    },
}