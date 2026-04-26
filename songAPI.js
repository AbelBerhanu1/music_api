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

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
    const { method, url } = req;
    
    console.log("\n📨 REQUEST RECEIVED:");
    console.log("   RAW URL:", url);
    
    // Parse URL
    const urlParts = url.split('?');
    
    // Normalize the path - remove trailing slashes
    let pathname = urlParts[0].replace(/\/+$/, '') || '/';
    const params = new URLSearchParams(urlParts[1] || '');
    let id = params.get('id');
    
    console.log("   PATHNAME:", pathname);
    console.log("   METHOD:", method);
    console.log("   ID PARAM:", id);
    
    // Handle path parameter format like /api/songs/1
    const pathMatch = pathname.match(/^\/api\/songs\/(\d+)$/);
    if (pathMatch) {
        id = pathMatch[1];
        pathname = '/api/songs';
        console.log("   EXTRACTED ID FROM PATH:", id);
    }
    
    // Root route - API documentation
    if (pathname === '/' && method === 'GET') {
        sendJSON(res, 200, {
            message: '🎵 Welcome to Music API',
            endpoints: {
                'GET /api/songs': 'Get all songs',
                'GET /api/songs?id=1': 'Get song by ID (query param)',
                'GET /api/songs/1': 'Get song by ID (path param)',
                'POST /api/songs': 'Add a new song',
                'PUT /api/songs?id=1': 'Update song (query param)',
                'PUT /api/songs/1': 'Update song (path param)',
                'DELETE /api/songs?id=1': 'Delete song (query param)',
                'DELETE /api/songs/1': 'Delete song (path param)'
            }
        });
        return;
    }
    
    // GET /api/songs - Get all songs (READ)
    if (pathname === '/api/songs' && method === 'GET' && !id) {
        const songs = readSongs();
        sendJSON(res, 200, songs);
    }
    
    // GET /api/songs?id=1 OR /api/songs/1 - Get single song by ID (READ)
    else if (pathname === '/api/songs' && method === 'GET' && id) {
        const songs = readSongs();
        const song = songs.find(s => s.id === parseInt(id));
        
        if (song) {
            sendJSON(res, 200, song);
        } else {
            sendJSON(res, 404, { error: `Song with id ${id} not found` });
        }
    }
    
    // POST /api/songs - Add a new song (CREATE)
    else if (pathname === '/api/songs' && method === 'POST') {
        try {
            const body = await parseRequestBody(req);
            const songs = readSongs();
            
            if (!body.title || !body.artist) {
                sendJSON(res, 400, { 
                    error: 'Missing required fields. Required: title, artist' 
                });
                return;
            }
            
            const newId = songs.length > 0 ? Math.max(...songs.map(s => s.id)) + 1 : 1;
            
            const newSong = {
                id: newId,
                title: body.title,
                artist: body.artist,
                album: body.album || '',
                genre: body.genre || '',
                releaseYear: body.releaseYear || null,
                description: body.description || '',
                keyWords: body.keyWords || []
            };
            
            songs.push(newSong);
            writeSongs(songs);
            
            sendJSON(res, 201, { 
                message: 'Song added successfully', 
                song: newSong 
            });
        } catch (error) {
            sendJSON(res, 400, { error: 'Invalid JSON body' });
        }
    }
    
    // PUT /api/songs?id=1 OR /api/songs/1 - Update a song (UPDATE)
    else if (pathname === '/api/songs' && method === 'PUT' && id) {
        try {
            const songId = parseInt(id);
            const body = await parseRequestBody(req);
            const songs = readSongs();
            const songIndex = songs.findIndex(s => s.id === songId);
            
            if (songIndex === -1) {
                sendJSON(res, 404, { error: `Song with id ${songId} not found` });
                return;
            }
            
            const updatedSong = {
                id: songId,
                title: body.title || songs[songIndex].title,
                artist: body.artist || songs[songIndex].artist,
                album: body.album !== undefined ? body.album : songs[songIndex].album,
                genre: body.genre !== undefined ? body.genre : songs[songIndex].genre,
                releaseYear: body.releaseYear !== undefined ? body.releaseYear : songs[songIndex].releaseYear,
                description: body.description !== undefined ? body.description : songs[songIndex].description,
                keyWords: body.keyWords || songs[songIndex].keyWords
            };
            
            songs[songIndex] = updatedSong;
            writeSongs(songs);
            
            sendJSON(res, 200, { 
                message: 'Song updated successfully', 
                song: updatedSong 
            });
        } catch (error) {
            sendJSON(res, 400, { error: 'Invalid JSON body' });
        }
    }
    
    // DELETE /api/songs?id=1 OR /api/songs/1 - Delete a song (DELETE)
    else if (pathname === '/api/songs' && method === 'DELETE' && id) {
        const songId = parseInt(id);
        const songs = readSongs();
        const songIndex = songs.findIndex(s => s.id === songId);
        
        if (songIndex === -1) {
            sendJSON(res, 404, { error: `Song with id ${songId} not found` });
            return;
        }
        
        const deletedSong = songs.splice(songIndex, 1);
        writeSongs(songs);
        
        sendJSON(res, 200, { 
            message: 'Song deleted successfully', 
            deletedSong: deletedSong[0] 
        });
    }
    
    // 404 - Route not found
    else {
        sendJSON(res, 404, { error: 'Route not found. Use /api/songs' });
    }
});
