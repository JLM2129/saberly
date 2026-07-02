const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
const staticDir = path.join(__dirname, '..', 'app');
const usersFile = path.join(__dirname, 'data', 'users.json');

app.use(cors());
app.use(express.json());
app.use(express.static(staticDir, { index: false }));

const readUsers = () => {
  try {
    return JSON.parse(fs.readFileSync(usersFile, 'utf8')) || [];
  } catch (error) {
    return [];
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
};

const getEmailFromToken = (token) => {
  if (!token) return null;
  const match = token.match(/^Bearer offline-(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
};

app.get('/api/health/', (req, res) => {
  res.json({ status: 'ok', mode: 'offline' });
});

app.post('/api/users/login/', (req, res) => {
  const { email, password } = req.body || {};
  const users = readUsers();
  const user = users.find((item) => item.email === email && item.password === password);

  if (!user) {
    return res.status(401).json({ detail: 'Email o contraseña incorrectos.' });
  }

  const access = `offline-${encodeURIComponent(user.email)}`;
  const refresh = `offline-refresh-${encodeURIComponent(user.email)}`;

  return res.json({ access, refresh });
});

app.post('/api/users/register/', (req, res) => {
  const { email, password, first_name, last_name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email y contraseña son obligatorios.' });
  }

  const users = readUsers();
  if (users.some((item) => item.email === email)) {
    return res.status(400).json({ detail: 'Ya existe un usuario con ese email.' });
  }

  const newUser = {
    email,
    password,
    full_name: `${first_name || ''} ${last_name || ''}`.trim(),
    avatar_url: '',
    birthdate: '',
    gender: '',
    school: '',
    grade: '',
    learning_style: '',
    study_habits: '',
    language_preference: '',
    special_education_needs: '',
    extra_support: false,
    access_to_devices: '',
    student_type: '',
    learning_goals: '',
    is_verified: false,
    is_teacher: false,
    is_content_admin: false
  };

  users.push(newUser);
  writeUsers(users);

  return res.status(201).json(newUser);
});

app.get('/api/users/profile/', (req, res) => {
  const token = req.headers.authorization || '';
  const email = getEmailFromToken(token);

  if (!email) {
    return res.status(401).json({ detail: 'Token inválido o ausente.' });
  }

  const users = readUsers();
  const user = users.find((item) => item.email === email);
  if (!user) {
    return res.status(404).json({ detail: 'Usuario no encontrado.' });
  }

  const { password, ...profile } = user;
  return res.json(profile);
});

app.patch('/api/users/profile/', (req, res) => {
  const token = req.headers.authorization || '';
  const email = getEmailFromToken(token);

  if (!email) {
    return res.status(401).json({ detail: 'Token inválido o ausente.' });
  }

  const users = readUsers();
  const index = users.findIndex((item) => item.email === email);
  if (index === -1) {
    return res.status(404).json({ detail: 'Usuario no encontrado.' });
  }

  const updated = {
    ...users[index],
    ...req.body,
    email,
    password: users[index].password
  };

  users[index] = updated;
  writeUsers(users);

  const { password, ...profile } = updated;
  return res.json(profile);
});

app.get('/api/*', (req, res) => {
  res.status(404).json({ detail: 'Endpoint offline no implementado.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Offline server running at http://localhost:${port}`);
});
