const http = require('http');
const fs = require('fs');
const path = require('path');

const songsFilePath = path.join(__dirname, 'songs.json');

function readSongs() {
    try {
        const data = fs.readFileSync(songsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function writeSongs(songs) {
    fs.writeFileSync(songsFilePath, JSON.stringify(songs, null, 2), 'utf8');
}

function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}