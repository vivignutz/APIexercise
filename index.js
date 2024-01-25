const http = require('http');
const url = require('url');
const fs = require('fs');

// Method to read data
function getAllPets(res) {
    fs.readFile('db.json', 'utf8', (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Error reading pet data' }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        }
    });
}

// Method to add new pets
async function addPet(req, res) {
    let data = '';

    req.on('data', (chunk) => {
        data += chunk;
    });

    req.on('end', () => {
        try {
            if (!data.trim()) {
                throw new Error('Request body is empty');
            }

            const newPet = JSON.parse(data);

            fs.readFile('db.json', 'utf8', (err, existingData) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Error reading pet data' }));
                } else {
                    const pets = JSON.parse(existingData);

                    newPet.id = generateUniqueId(pets);

                    pets.push(newPet);

                    fs.writeFile('db.json', JSON.stringify(pets), 'utf8', (err) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Error writing pet data' }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'New pet added', pet: newPet }));
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Error parsing JSON from the request body:', error.message);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON in the request body' }));
        }
    });
}

// Generate new ID
function generateUniqueId(pets) {
  const maxId = pets.reduce((max, pet) => (pet.id > max ? pet.id : max), 0);
  return maxId + 1;
}

// Method to save data
function savePetsToFile(pets) {
    return new Promise((resolve, reject) => {
        fs.writeFile('db.json', JSON.stringify(pets), 'utf8', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Editing pet
async function editPet(req, res) {
    try {
        const body = await getRequestBody(req);
        const pets = await readPetsFromFile();

        // To find pet by ID
        const petId = parseInt(req.params.id);
        const petIndex = pets.findIndex(pet => pet.id === petId);

        if (petIndex !== -1) {
            // Update pet's details
            pets[petIndex] = { ...pets[petIndex], ...body };

            // Saving pet's update
            await savePetsToFile(pets);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Pet successfully edited' }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Pet not found' }));
        }
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error editing pet' }));
    }
}

// Method to read data
function readPetsFromFile() {
    return new Promise((resolve, reject) => {
        fs.readFile('db.json', 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
}

// Creating server and routing
const server = http.createServer(async (req, res) => {
    // CORS configuration
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    const parseUrl = url.parse(req.url, true);
    const path = parseUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (path === '/pets' && req.method === 'GET') {
        getAllPets(res);
    } else if (path === '/pets' && req.method === 'POST') {
        await addPet(req, res);
    } else if (path.startsWith('/pets/') && req.method === 'PUT') {
        const petId = parseInt(path.split('/')[2]);
        req.params = { id: petId };
        await editPet(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Route not found' }));
    }
});

const port = 2000;
server.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
