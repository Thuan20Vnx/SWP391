require('dotenv').config();
const mongoose = require('mongoose');
const userService = require('../src/services/user.service');
const User = require('../src/models/User');

const tiny =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI missing');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const user = await User.findOne().sort({ updatedAt: -1 });
  if (!user) {
    console.log('No users in DB');
    process.exit(1);
  }

  console.log('Testing with', user.email, 'role=', user.role);

  try {
    const result = await userService.updateProfile(user.email, { picture: tiny });
    console.log('updateProfile OK', result.message);
    console.log('picture length', (result.user.picture || '').length);
  } catch (e) {
    console.error('updateProfile FAIL', e.statusCode, e.message, e.isOperational);
    console.error(e.stack);
  }

  await mongoose.disconnect();
}

main();
