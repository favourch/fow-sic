const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const cookieParser = require('cookie-parser');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Define focus areas and their corresponding JSON files
const focusAreas = [
  { name: 'Bees/Plants', file: 'bees-plants.json' },
  { name: 'Fresh Water/Oceans', file: 'fresh-water-oceans.json' },
  { name: 'Fires/Floods', file: 'fires-floods.json' },
  { name: 'Trees/Forests/Jungle', file: 'trees-forests-jungle.json' },
];

// Load SDG goals
const goalsFilePath = path.join(__dirname, 'data', 'goals', 'goals.json');
const goals = JSON.parse(fs.readFileSync(goalsFilePath, 'utf8'));

// Function to get goal details by SDG code
const getGoalDetails = async (sdgCode) => {
  try {
    const response = await axios.get('https://sdg.fchukwuedo.workers.dev/');
    const goal = response.data.find(g => g.code === sdgCode);
    return goal ? goal : { title: 'Unknown Goal', color: '#ffffff' };
  } catch (error) {
    console.error('Error fetching SDG data:', error);
    return { title: 'Unknown Goal', color: '#ffffff' };
  }
};

// Landing page route
app.get('/', (req, res) => {
  res.render('landing');
});

// Route for teacher to view focus areas and enter number of groups
app.get('/teacher', (req, res) => {
  res.render('index', { focusAreas });
});

// Route for creating groups
app.post('/create-groups', async (req, res) => {
  const { groupCount } = req.body;
  const groups = [];

  for (let i = 0; i < groupCount; i++) {
    const group = {
      name: `Group ${i + 1}`,
      problems: [],
      likes: 0,
      dislikes: 0,
    };

    const focusArea = focusAreas[i % focusAreas.length];
    const filePath = path.join(__dirname, 'data', 'focus-areas', focusArea.file);
    const focusAreaProblems = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const selectedProblems = [];

    // Select 5 random problems for the group
    for (let j = 0; j < 5; j++) {
      const randomProblem = focusAreaProblems[Math.floor(Math.random() * focusAreaProblems.length)];
      const goalDetails = await getGoalDetails(randomProblem.SDG);
      randomProblem.goalTitle = goalDetails.title;
      randomProblem.color = goalDetails.color;
      selectedProblems.push(randomProblem);
    }

    group.problems = selectedProblems;
    groups.push(group);
  }

  // Generate unique code for the session
  const uniqueCode = shortid.generate();
  const sessionData = {
    code: uniqueCode,
    groups,
    visitCount: 0, // Initialize visit count
  };

  // Save session data to a JSON file
  fs.writeFileSync(path.join(__dirname, 'data', 'activities', `${uniqueCode}.json`), JSON.stringify(sessionData, null, 2));

  res.redirect(`/groups/${uniqueCode}`);
});

// Endpoint to handle student form submission and redirect
app.get('/groups', (req, res) => {
  const { code } = req.query;
  res.redirect(`/groups/${code}`);
});

// Route to display groups based on unique code
app.get('/groups/:code', (req, res) => {
  const { code } = req.params;
  const sessionFilePath = path.join(__dirname, 'data', 'activities', `${code}.json`);

  if (fs.existsSync(sessionFilePath)) {
    let sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));

    if (!req.cookies[`visited_${code}`]) {
      sessionData.visitCount = (sessionData.visitCount || 0) + 1; // Increment visit count
      fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2)); // Save updated session data
      res.cookie(`visited_${code}`, 'yes', { maxAge: 24 * 60 * 60 * 1000 }); // Set cookie for 24 hours
    }

    res.render('groups', { groups: sessionData.groups, code, visitCount: sessionData.visitCount });
  } else {
    res.status(404).send('Invalid code.');
  }
});

// Endpoint to handle like requests
app.post('/like/:code/:groupIndex/:cardIndex', (req, res) => {
  const { code, groupIndex, cardIndex } = req.params;
  const sessionFilePath = path.join(__dirname, 'data', 'activities', `${code}.json`);

  if (fs.existsSync(sessionFilePath)) {
    let sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
    sessionData.groups[groupIndex].problems[cardIndex].likes = (sessionData.groups[groupIndex].problems[cardIndex].likes || 0) + 1;
    fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2));
    res.status(200).send('Like recorded');
  } else {
    res.status(404).send('Invalid code.');
  }
});

// Endpoint to handle dislike requests
app.post('/dislike/:code/:groupIndex/:cardIndex', (req, res) => {
  const { code, groupIndex, cardIndex } = req.params;
  const sessionFilePath = path.join(__dirname, 'data', 'activities', `${code}.json`);

  if (fs.existsSync(sessionFilePath)) {
    let sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
    sessionData.groups[groupIndex].problems.splice(cardIndex, 1); // Remove the problem from the list
    fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2));
    res.status(200).send('Dislike recorded');
  } else {
    res.status(404).send('Invalid code.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
