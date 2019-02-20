const TelegramBot = require('node-telegram-bot-api');
const { GREETING, PROFESSIONS, QUESTIONS, getResultText } = require('./phrases.js');

const TOKEN = '740147923:AAEUa5LoNT5rulsyFHwXgxl1hERT9aTlAik';

const bot = new TelegramBot(TOKEN, { polling: true });

const QUESTIONS_NUMBER = 19;

const START_PHRASES = ['Начать опрос', 'Пройти опрос заново'];

const users = {};

const states = {
	IDLE: 0,
	IN_PROGRESS: 1,
	DONE: 2
};

const initialUser = { state: states.IDLE, questionNumber: 0 };

function getRandomArrayElement(array) {
	const randomIdx = Math.floor(Math.random() * array.length);

	return array[randomIdx]
}

function sendGreeting(chatId) {
	bot.sendMessage(chatId, GREETING, {
		"reply_markup": {
			"keyboard": [[START_PHRASES[0]]]
		}
	});
}

function sendRepetedGreeting(chatId) {
	bot.sendMessage(chatId, 'Оу, я смотрю, тебе понравилось. Хочешь ещё раз?', {
		"reply_markup": {
			"keyboard": [[START_PHRASES[1]]]
		}
	});
}

function formQuestionWithOptions(chatId) {
	const user = users[chatId];
	const currentQuestionNumber = user.questionNumber;
	const questionInfo = QUESTIONS.find(elem => elem.order === currentQuestionNumber);

	const question = `${currentQuestionNumber}. ${questionInfo.question}`;
	const options = questionInfo.map(elem => [elem]);

	return { question, options };
}

function sendQuestion(chatId, question, options) {
	bot.sendMessage(chatId, question, {
		"reply_markup": {
			"keyboard": options
		}
	});
}

function sendResult(chatId) {
	const randomProfession = getRandomArrayElement(PROFESSIONS);
	const resultText = getResultText(randomProfession);

	bot.sendMessage(chatId, resultText);
}

function isAnswerValid(chatId, text) {
	const currentQuestionNumber = users[chatId].questionNumber;
	const answers = QUESTIONS.find(elem => elem.order === currentQuestionNumber).answers;

	return answers.some(([answer]) => answer.toLowerCase().indexOf(text) === 0);
}

function isStartPhrase(text) {
	return START_PHRASES.some(phrase => phrase === text);
}

function startPoll(chatId) {
	users[chatId].questionNumber += 1;

	const { question, options } = formQuestionWithOptions(chatId);

	sendQuestion(chatId, question, options);
}

bot.onText(/\/start/, (msg) => {
	const chatId = msg.chat.id;

	users[chatId] = { ...initialUser };

	sendGreeting(chatId);
});

bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	const text = msg.text.toString().toLowerCase();

	if (/\/start/.test(text)) return;

	if (isStartPhrase(teXt)) {
		startPoll(chatId);
		return;
	}

	const isAnswerValid = isAnswerValid(chatId, text);
	const isLastQuestion = users[chatId].questionNumber === 19;

	if (isAnswerValid && isLastQuestion) {
		sendResult(chatId);

		users[chatId].state = { ...initialUser };
		sendRepeatedGreeting(chatId);
	} else if (isAnswerValid) {
		users[chatId].questionNumber += 1;

		const { question, options } = formQuestionWithOptions(chatId);

		sendQuestion(chatId, question, options);
	} else {
		bot.sendMessage(chatId, 'Мне незнакома эта команда');
	}
});
