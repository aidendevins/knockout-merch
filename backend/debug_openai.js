require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-test',
});

// Version check skipped due to export restrictions


try {
    console.log('openai.images keys:', Object.keys(openai.images));
    console.log('openai.images prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(openai.images)));

    if (openai.images.edit) {
        console.log('Found openai.images.edit');
    }
    if (openai.images.edits) {
        console.log('Found openai.images.edits');
    }
} catch (error) {
    console.error('Error inspecting openai.images:', error);
}
