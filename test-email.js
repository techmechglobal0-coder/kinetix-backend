require('dotenv').config();
const { testEmailConnection } = require('./config/email'); // adjust path
testEmailConnection().then(success => {
    console.log('SMTP test result:', success);
    process.exit(0);
});