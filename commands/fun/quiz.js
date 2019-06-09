const { Command } = require('discord.js-commando');
const { stripIndents } = require('common-tags');
const request = require('node-superfetch');
const { shuffle, list } = require('../util');
const types = ['multiple', 'boolean'];
const difficulties = ['easy', 'medium', 'hard'];
const choices = ['A', 'B', 'C', 'D'];

module.exports = class quizCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'quiz',
			aliases: ['trivia'],
			group: 'fun',
			memberName: 'quiz',
			description: 'Random questions.',
			guildOnly: true,
			details: stripIndents`
				**Types:** ${types.join(', ')}
				**Difficulties:** ${difficulties.join(', ')}
			`,
			args: [
				{
					key: 'difficulty',
					prompt: `What should the difficulty be? Either ${list(difficulties, 'or')}.`,
					type: 'string',
					default: '',
					oneOf: difficulties,
					parse: difficulty => difficulty.toLowerCase()
				},
				{
					key: 'type',
					prompt: `Which type of question would you like? Either ${list(types, 'or')}.`,
					type: 'string',
					default: 'multiple',
					oneOf: types,
					parse: type => type.toLowerCase()
				}
				
			]
		});
	}

	async run(msg, { type, difficulty }) {
		try {
			const { body } = await request
				.get('https://opentdb.com/api.php')
				.query({
					amount: 1,
					type,
					encode: 'url3986',
					difficulty
				});
			if (!body.results) return msg.reply('Oh no, a question could not be fetched. Try again later!');
			const answers = body.results[0].incorrect_answers.map(answer => decodeURIComponent(answer.toLowerCase()));
			const correct = decodeURIComponent(body.results[0].correct_answer.toLowerCase());
			answers.push(correct);
			const shuffled = shuffle(answers);
			await msg.reply(stripIndents`
				**You have 15 seconds to answer this question.**
				${decodeURIComponent(body.results[0].question)}
				${shuffled.map((answer, i) => `**${choices[i]}.** ${answer}`).join('\n')}
			`);
			const filter = res => res.author.id === msg.author.id && choices.includes(res.content.toUpperCase());
			const msgs = await msg.channel.awaitMessages(filter, {
				max: 1,
				time: 15000
			});
			if (!msgs.size) return msg.reply(`Sorry, time is up! It was ${correct}.`);
			const win = shuffled[choices.indexOf(msgs.first().content.toUpperCase())] === correct;
			if (!win) return msg.reply(`Nope, sorry. The answer is ${correct}.`);
			return msg.reply('You are correct!');
		} catch (err) {
			return msg.reply(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
		}
	}
};
