const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');

const TelegramBot = require('node-telegram-bot-api');
const debounce = require('lodash/debounce');

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

childProcess.fork(path.resolve(__dirname, './images.js'));

let usersNumber = 0;
let passed = 0;
const statPath = path.resolve(__dirname, './statistics.json');
let isWriting = false;

function getStatJSON() {
	return JSON.stringify({ users: usersNumber, passed });
}

function updateStatFile() {
	isWriting = true;
	const data = new Uint8Array(Buffer.from(getStatJSON()))

	fs.writeFile(statPath, data, (err) => {
		if (err) console.log('err couldnt write file');
		isWriting = false;
	});
}

const debouncedUpdateStatFile = debounce(updateStatFile, 500);

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

function sendRepeatedGreeting(chatId) {
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
	const options = questionInfo.answers.map(elem => [elem]);

	return { question, options };
}

function sendQuestion(chatId, question, options) {
	bot.sendMessage(chatId, question, {
		"reply_markup": {
			"keyboard": options
		},
		parse_mode: "HTML"
	});
}

const imagesHost = 'http://18.220.243.158:3000/';

function sendResult(chatId) {
	const randomProfession = getRandomArrayElement(PROFESSIONS);
	const resultText = getResultText(randomProfession.text);

	bot.sendMessage(chatId, resultText, { parse_mode: "HTML" });
	bot.sendPhoto(chatId, imagesHost + randomProfession.img);
}

function checkIsAnswerValid(chatId, text) {
	const currentQuestionNumber = users[chatId].questionNumber;
	const answers = QUESTIONS.find(elem => elem.order === currentQuestionNumber).answers;

	return answers.some(answer => answer.toLowerCase() === text);
}

function isStartPhrase(text) {
	return START_PHRASES.some(phrase => phrase.toLowerCase() === text);
}

function startPoll(chatId) {
	users[chatId].questionNumber += 1;

	const { question, options } = formQuestionWithOptions(chatId); 

	sendQuestion(chatId, question, options);
}

bot.onText(/\/start/, (msg) => {
	const chatId = msg.chat.id;

	if (!(chatId in users)) {
		users[chatId] = { ...initialUser, isPassed: false };

		usersNumber += 1;
		debouncedUpdateStatFile();
	} else {
		users[chatId] = { ...initialUser, isPassed: users[chatId].isPassed };
	}

	sendGreeting(chatId);
});

bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	const text = msg.text.toString().toLowerCase();

	if (/\/start/.test(text)) return;

	if (isStartPhrase(text)) {
		startPoll(chatId);
		return;
	}

	const isAnswerValid = checkIsAnswerValid(chatId, text);
	const isLastQuestion = users[chatId].questionNumber === 19;

	if (isAnswerValid && isLastQuestion) {
		sendResult(chatId);

		if (!users[chatId].isPassed) {
			passed += 1;
			updateStatFile();
		}
		users[chatId] = { ...initialUser, isPassed: true };
		sendRepeatedGreeting(chatId);
	} else if (isAnswerValid) {
		users[chatId].questionNumber += 1;

		const { question, options } = formQuestionWithOptions(chatId);

		sendQuestion(chatId, question, options);
	} else {
		bot.sendMessage(chatId, 'Мне незнакома эта команда');
	}
});
