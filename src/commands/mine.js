const { goals } = require('mineflayer-pathfinder');
const signale = require('signale');
const { Vec3 } = require('vec3');
const basicUtils = require('../utils/basicUtils');
const { eat, food } = require('../modules/pvpModule');

async function ensureHarvestable(bot, blockID, mcData) {
    for (let item of bot.inventory.items()) {
        if (mcData.blocks[blockID].harvestTools != undefined && mcData.blocks[blockID].harvestTools[item.type] == true) {
            await bot.equip(item, 'hand');
            return;
        }
    }
}

async function findNearBlocks(bot, block, id, BLOCKLIST) {
    await checkAndAdd(bot, block.clone().offset(1, 0, 0), id, BLOCKLIST);
    await checkAndAdd(bot, block.clone().offset(-1, 0, 0), id, BLOCKLIST);
    await checkAndAdd(bot, block.clone().offset(0, 0, 1), id, BLOCKLIST);
    await checkAndAdd(bot, block.clone().offset(0, 0, -1), id, BLOCKLIST);
    await checkAndAdd(bot, block.clone().offset(0, 1, 0), id, BLOCKLIST);
    await checkAndAdd(bot, block.clone().offset(0, -1, 0), id, BLOCKLIST);
    return Array.from(BLOCKLIST);
}
function isSame(a, b) {
    return (a.x == b.x && a.y == b.y && a.z == b.z);
}

async function checkAndAdd(bot, block, id, BLOCKLIST) {
    if ((await bot.blockAt(block, false)).type == id && BLOCKLIST.filter(e => isSame(e, block)).length == 0) {
        BLOCKLIST.push(block);
        await findNearBlocks(bot, block, id, BLOCKLIST);
    }
}

async function itemsToString(bot) {
    let imap = {};
    for (let item of await bot.inventory.items()) {
        if (!(item.name in imap)) imap[item.name] = 0;
        imap[item.name] += item.count;
    }
    let is = '';
    for (let k of Object.keys(imap)) {
        is += k + ': ' + imap[k] + '\n';
    }
    return is;
}

async function selectedItems(bot, blocklist, mcData) {
    let items = [];
    for (let b of blocklist) {
        for (let drop of mcData.blocks[b].drops) {
            let item = mcData.items[drop];
            for (let invitem of await bot.inventory.items()) {
                // TODO: change because this is terrible
                if (item.name.includes(invitem.name)) items.push(invitem);
            }
        }
    }
    return items;
}

async function otherItems(bot) {
    let items = [];
    for (let item of bot.inventory.items()) {
        if (!item.name.includes('_pickaxe') && !item.name.includes('_shovel') && !item.name.includes('_axe') && !item.name.includes('_sword'))
            items.push(item);
    }
    return items;
}

module.exports = (program) => {
    program
        .command('mine <blocks>')
        .description('mine blocks (can be array separated by ",")')
        .option('-o, --owner <owner>', 'bot will react to messages only from this person', null)
        .option('-a <a>', 'if inventory is full then put selected items in this chest', null)
        .option('-b <b>', 'if inventory is full then put other items in this chest', null)
        .action(async (blocks, options) => {
            if ((options.a && !options.b) || (options.b && !options.a)) {
                signale.error('a and b must be specified at the same time');
                return;
            }
            const { bot, mcData } = await require('../client').create(program.opts());
            // console.log(mcData.blocksByName.diamond_ore);
            // console.log(mcData.items[181]);

            const blocklist = blocks.split(',').map(e => e.trim()).map(e => mcData.blocksByName[e].id);
            var blocksMC = [];

            // setup status command
            bot.on('whisper', async (username, message, ...data) => {
                if (options.owner == undefined || username == options.owner) {
                    if (message == 'status') {
                        bot.whisper(username, `Mining status\n========\n
                        Full slots in inventory: ${bot.inventory.items().length}\n
                        ${await itemsToString(bot)}`);
                    }
                }
            });

            while (true) {
                if (bot.food < 10) {
                    await eat(bot, food);
                }

                if (blocksMC.length <= 0) {
                    signale.pending('looking for blocks to mine');
                    blocksMC = await bot.findBlocks({
                        matching: blocklist,
                        maxDistance: 256,
                        count: 100
                    });
                    if (blocksMC.length == 0) {
                        signale.info('cannot find blocks in this area, going to the next one');
                        await bot.goto(new goals.GoalXZ(Math.floor(bot.entity.position.x) + 100, Math.floor(bot.entity.position.z)));
                        continue;
                    }
                    signale.complete(`found ${blocksMC.length} blocks`);
                }
                if (blocksMC.length > 0) {
                    // get next block to mine
                    let block = blocksMC.shift();
                    // check what block is it
                    let blockI = await bot.blockAt(block, false);
                    if (!blocklist.includes(blockI.type)) continue;
                    // go to the block
                    try {
                        await bot.pathfinder.goto(new goals.GoalBlock(block.x, block.y, block.z));
                    } catch (error) {
                        signale.error('could not find path to an ore, looking for a next one');
                        continue;
                    }
                    await ensureHarvestable(bot, blockI.type, mcData);
                    await bot.dig(blockI, err => {
                        if (err == undefined) return;
                        signale.error('could not dig a block (A)');
                    });
                    // find blocks that are connected to this block
                    signale.start('checking vein size');
                    let vein = await findNearBlocks(bot, block, blockI.type, []);
                    signale.success(`found vein with size ${vein.length + 1}`);
                    // mine all blocks in the vein
                    for (let vb of vein) {
                        await bot.pathfinder.goto(new goals.GoalGetToBlock(vb.x, vb.y, vb.z), () => { });
                        let vbb = bot.blockAt(vb);
                        await ensureHarvestable(bot, vbb.type, mcData);
                        await bot.dig(vbb, err => {
                            if (err == undefined) return;
                            signale.error('could not dig a block (B)');
                        });
                    }

                    // pickup all nearby items
                    for (let ek of Object.keys(bot.entities)) {
                        let ent = bot.entities[ek];
                        if (ent == undefined) continue;
                        if (ent.mobType == 'Item' && ent.position.distanceTo(bot.entity.position) < 8) {
                            let p = ent.position;
                            await bot.pathfinder.goto(new goals.GoalBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)), () => { });
                            await basicUtils.wait(500);
                        }
                    }

                    // check if inventory is full
                    if (bot.inventory.items().length >= 35) {
                        // if chests are specified then put items inside them
                        if (options.a) {
                            signale.pending('inventory full: depositing items into the chests')
                            let ac = options.a.split(' ').map(e => parseInt(e));
                            let bc = options.b.split(' ').map(e => parseInt(e));

                            // deposit selected
                            await bot.pathfinder.goto(new goals.GoalGetToBlock(ac[0], ac[1], ac[2]), () => { });
                            let chest = await bot.openChest(await bot.blockAt(new Vec3(ac[0], ac[1], ac[2])));
                            for (let i of await selectedItems(bot, blocklist, mcData)) {
                                await chest.deposit(i.type, null, i.count, () => { });
                            }
                            await chest.close();

                            // deposit other
                            await bot.pathfinder.goto(new goals.GoalGetToBlock(bc[0], bc[1], bc[2]));
                            chest = await bot.openChest(await bot.blockAt(new Vec3(bc[0], bc[1], bc[2])));
                            for (let i of await otherItems(bot))
                                await chest.deposit(i.type, null, i.count, () => { });
                            await chest.close();

                        } else {
                            bot.quit('full inventory');
                            signale.success('INVENTORY FULL: QUITTING');
                        };
                    }
                }
            }
        });
}