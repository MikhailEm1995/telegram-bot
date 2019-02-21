const path = require('path');
const express = require('express');

const app = express();

const imagesFolder = path.resolve(__dirname, './images');

app.use(express.static(imagesFolder, { redirect: false }));

app.listen(8080, () => {
	console.log('Server listens on port:', 8080);
});
