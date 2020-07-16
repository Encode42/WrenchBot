const { Command } = require('discord.js-commando');
const config = require("../../config.json");
const auth = require("../../auth.json");
const { RichEmbed } = require('discord.js');
const RateLimiter = require('limiter').RateLimiter;
const TokenBucket = require('limiter').TokenBucket;
const { stripIndents } = require('common-tags');

const Enmap = require("enmap");
const { commandsRead, messagesRead, translationsDone, settings } = require('../../data/js/enmap.js');

if (config.translator === 'enabled') {
	if (config.provider === 'yandex') {
		var translator = require('yandex-translate')(auth.yandex);
		var link = 'http://cust.pw/yandexlang';
	}
	if (config.provider === 'google') {
		var translator = require('google-translate')(auth.google);
		var link = 'http://cust.pw/googlelang';
	}
	if (config.provider === 'baidu') {
		var translator = require("baidu-translate-api");
		var link = 'http://cust.pw/baidulang';
	}
}

module.exports = class translateCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'translate',
			group: 'helpful',
			aliases: ['tran'],
			memberName: 'translate',
			description: 'Translate text to another language.',
			examples: ['translate en de Hello!', 'translate de es Hallo!'],
			guildOnly: true,
			details: stripIndents`
				**Languages** ${link}
				**To translate** Run \`translate <from> <to> <text to translate>\`
			`,

			args: [
				{
					key: 'langFrom',
					prompt: 'What language do you want to translate from?',
					type: 'string',
				},
				{
					key: 'langTo',
					prompt: 'What language do you want to translate to?',
					type: 'string',
				},
				{
					key: 'langTran',
					prompt: 'What do you want to translate?',
					type: 'string',
				}

			]
		});
	}
	run(msg, { langFrom, langTo, langTran }) {
		if (config.translator === 'enabled') {
			translationsDone.ensure("number", 0);
			let translate = `${langTran}`;
			let translatedText;
			let translatedFrom;
			let translatedTo;
			let provider;
			let link;
			
			if (translate.length < 5) return;
			
			// Message sanitization
			// Members
			if (msg.guild !== null) {
				let users = msg.guild.roles.get(msg.guild.id).members.map(m => m.user.username).join('|');
				translate = translate.replace(new RegExp(users, "gi"), '');
			}
	
			translate = translate.replace(/http.[^\s]*/gu, '')		// Links
			.replace(/<@.*>|@[^\s]+/gu, '')							// Mentions
			.replace(/<:.*>|:.*:/gu, '')							// Emojis
			.replace(/[^\p{L}1-9.,!?'"\-+\s]/giu, '')				// Symbols
			.replace(/`|\s+/gu, ' ').trim();						// Trimming
	
			if (translate === "") return;
			
			// Ratelimiting
			const monthBucket = new TokenBucket('10000000', 'month', null);
			if (!monthBucket.tryRemoveTokens(msg.length)) return;
			const dayBucket = new TokenBucket('322580', 'day', null);
			if (!dayBucket.tryRemoveTokens(msg.length)) return;
			
			// Translate the message
			if (config.provider === 'yandex') {
				translator.translate(translate, {from: `${langFrom}`, to: `${langTo}`}, (err, translated) => {
					if (!translated.text) return msg.reply('you entered an invalid language! Go to http://cust.pw/yandexlang to see availible languages!');
					translatedEmbed(translated.text, translated.lang, "", "Yandex.Translate", "yandex");
				}).catch(function () {const hide = 1});
			} else if (config.provider === 'google') {
				translator.translate(translate, `${langFrom}`, `${langTo}`, (err, translated) => {
					if (!translated.translatedText) return msg.reply('you entered an invalid language! Go to http://cust.pw/googlelang to see availible languages!');
					translatedEmbed(translated.translatedText, translated.detectedSourceLanguage, "-en", "Google Translate", "google");
				}).catch(function () {const hide = 1});
			} else if (config.provider === 'baidu') {
				translator(translate, {from: `${langFrom}`, to: `${langTo}`}).then(translated =>
					translatedEmbed(translated.trans_result.dst, translated.from, "-en", "Baidu Translate", "baidu")
				).catch(function () {return msg.reply('you entered an invalid language! Go to http://cust.pw/baidulang to see availible languages!')});
			}
			
			function translatedEmbed(translatedText, translatedFrom, translatedTo, provider, link) {
				if (translate === `${translatedText}`) return;
				translationsDone.inc("number");
		
				const embed = new RichEmbed()
				.setAuthor(`${msg.author.username} (${translatedFrom}${translatedTo})`, msg.author.displayAvatarURL)
				.setDescription(`**${translatedText}**`)
				.setFooter(`Translations from ${provider}. (http://cust.pw/${link})`)
				.setColor(0x2F5EA3);
				return msg.channel.send(embed);
			}
		} else return;
	}
};