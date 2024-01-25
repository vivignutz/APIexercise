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
    const newPet = JSON.parse(data);
    fs.readFile('db.json', 'utf8', (err, existingData) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error reading pet data' }));
      } else {
        const pets = JSON.parse(existingData);
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
  });
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

// Creating server and routing
const server = http.createServer(async (req, res) => {
  const parseUrl = url.parse(req.url, true);
  const path = parseUrl.pathname;

  if (path === '/pets' && req.method === 'GET') {
    getAllPets(res);
  } else if (path === '/pets' && req.method === 'POST') {
    await addPet(req, res);
  } else if (path.startsWith('/pets/') && req.method === 'PUT') {

    // Extracting pet ID from the path
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

// Method to get request body
function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
    });
}
