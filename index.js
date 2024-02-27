const { Client, MessageEmbed } = require('discord.js-selfbot-v13');
const fs = require('fs');

const client = new Client();
let ownerId; // Will be set dynamically
let messageToSend = ''; // Initialize messageToSend

let channelIntervals = {};
let interval = null;

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag} (${client.user.id})`);
    ownerId = client.user.id; // Set ownerId to the selfbot's user ID
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || message.author.id !== ownerId) return;

    if (message.content.startsWith('.message')) {
        // Set the message to send
        const args = message.content.split(' ');
        args.shift(); // Remove the command
        messageToSend = args.join(' ');
        message.channel.send(`\`\`\`\nMessage set to: "${messageToSend}"\n\`\`\``);
    } else if (message.content.startsWith('.setchannel')) {
        // Set the channel and interval
        const [_, channelId, rawInterval] = message.content.split(' ');
        const channel = client.channels.cache.get(channelId);
        if (!channel) return message.channel.send('Invalid channel ID.');

        const intervalMs = parseInterval(rawInterval);

        clearInterval(channelIntervals[channelId]?.interval);

        const channelData = channelIntervals[channelId] || { interval: intervalMs, lastSent: 0 };
        channelData.interval = intervalMs;
        channelIntervals[channelId] = channelData;

        message.channel.send(`**Setting message every ${rawInterval} in channel ${channel}**`);
    } else if (message.content.startsWith('.clearchannel')) {
        // Stop sending in the channel without clearing messages
        const [_, channelId] = message.content.split(' ');
        const channelData = channelIntervals[channelId];
        if (channelData) {
            clearInterval(channelData.interval);
            delete channelIntervals[channelId];
            message.channel.send(`**Stopped sending in channel ${channelId}**`);
        } else {
            message.channel.send(`**No autosender running for channel ${channelId}**`);
        }
    } else if (message.content.startsWith('.start')) {
        // Start sending messages
        const args = message.content.split(' ');
        if (args.length > 1) {
            // Channel-specific start
            const channelId = args[1];
            const channel = client.channels.cache.get(channelId);
            if (!channel) return message.channel.send('Invalid channel ID.');

            const channelData = channelIntervals[channelId];
            if (!channelData) return message.channel.send('Channel not set for autosending.');

            clearInterval(channelData.interval);

            const timeSinceLastSent = Date.now() - channelData.lastSent;
            const remainingTime = Math.max(0, channelData.interval - timeSinceLastSent);

            setTimeout(() => {
                channelData.interval = setInterval(() => {
                    channel.send(messageToSend);
                    channelData.lastSent = Date.now();
                }, channelData.interval);
            }, remainingTime);

            message.channel.send(`**Autosender started with the minimum interval set for channel ${channel}**`);
        } else {
            // Global start
            if (Object.keys(channelIntervals).length === 0) return message.channel.send('No channels are set for autosending.');

            clearInterval(interval);

            const nextTimes = Object.values(channelIntervals).map(c => c.lastSent + c.interval);
            const nextTime = Math.min(...nextTimes);

            setTimeout(() => {
                interval = setInterval(() => {
                    for (const channelId in channelIntervals) {
                        const channelData = channelIntervals[channelId];
                        const channel = client.channels.cache.get(channelId);
                        if (channel && Date.now() - channelData.lastSent >= channelData.interval) {
                            channel.send(messageToSend);
                            channelData.lastSent = Date.now();
                        }
                    }
                }, Math.min(...Object.values(channelIntervals).map(c => c.interval)));
            }, Math.max(0, nextTime - Date.now()));

            message.channel.send(`**Autosender started with the minimum interval set globally.**`);
        }
    } else if (message.content.startsWith('.stop')) {
        // Stop sending messages
        const args = message.content.split(' ');
        if (args.length > 1) {
            // Channel-specific stop
            const channelId = args[1];
            const channelData = channelIntervals[channelId];
            if (channelData) {
                clearInterval(channelData.interval);
                delete channelIntervals[channelId];
                message.channel.send(`**Autosender stopped for channel ${channelId}**`);
            } else {
                message.channel.send(`**No autosender running for channel ${channelId}**`);
            }
        } else {
            // Global stop
            clearInterval(interval);
            interval = null;
            for (const channelId in channelIntervals) {
                clearInterval(channelIntervals[channelId].interval);
                channelIntervals[channelId].lastSent = 0; // Reset lastSent for all channels
            }
            channelIntervals = {};
            message.channel.send(`**Autosender stopped globally.**`);
        }
    } else if (message.content === '.help') {
        // Display help information
        const helpText = `
**\`\`\`ini
[Selfbot Commands:]
- .message <your message>: Set the message to send.
- .setchannel <Channel ID> <Interval>: Set the channel and interval. (e.g., 10s, 10m, 10h, 10d)
- .clearchannel <Channel ID>: Stop sending in the channel without clearing messages.
- .start <Channel ID>: Start sending messages globally or in a specific channel.
- .stop <Channel ID>: Stop sending messages globally or in a specific channel.
\`\`\`**`;
        message.channel.send(helpText);
    }
});

function parseInterval(rawInterval) {
    const regex = /^(\d+)([smhd])$/;
    const match = rawInterval.match(regex);

    if (!match) {
        throw new Error('Invalid interval format. Use digits followed by "s", "m", "h", or "d".');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's':
            return value * 1000; // seconds to milliseconds
        case 'm':
            return value * 60 * 1000; // minutes to milliseconds
        case 'h':
            return value * 60 * 60 * 1000; // hours to milliseconds
        case 'd':
            return value * 24 * 60 * 60 * 1000; // days to milliseconds
        default:
            throw new Error('Invalid interval unit. Use "s", "m", "h", or "d".');
    }
}

client.login("OTYyMDQyMDAwNTYyMDgxNzk0.GIj4wV.pYzQywnhtOSr-x5E3dNCwMUXHdn6F5ERO-0c1s");