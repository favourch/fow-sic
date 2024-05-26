const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const shortid = require('shortid');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

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

// Function to get goal title by SDG code
const getGoalTitle = (sdgCode) => {
  const goal = goals.find(g => g.code === sdgCode);
  return goal ? goal.title : 'Unknown Goal';
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
app.post('/create-groups', (req, res) => {
  const { groupCount } = req.body;
  const groups = Array.from({ length: groupCount }, (_, i) => ({
    name: `Group ${i + 1}`,
    problem: null
  }));

  // Assign problems to groups
  groups.forEach((group, index) => {
    const focusArea = focusAreas[index % focusAreas.length];
    const filePath = path.join(__dirname, 'data', 'focus-areas', focusArea.file);
    const focusAreaProblems = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const randomProblem = focusAreaProblems[Math.floor(Math.random() * focusAreaProblems.length)];
    randomProblem.goalTitle = getGoalTitle(randomProblem.SDG);
    group.problem = randomProblem;
  });

  // Generate unique code for the session
  const uniqueCode = shortid.generate();
  const sessionData = {
    code: uniqueCode,
    groups,
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
      const sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
      res.render('groups', { groups: sessionData.groups, code });
    } else {
      res.status(404).send('Invalid code.');
    }
  });
  

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
