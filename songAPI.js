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